import { Router, Request, Response } from 'express';
import { eq, and, sql, avg, count, desc } from 'drizzle-orm';
import Stripe from 'stripe';
import { db } from '../db';
import { users, businesses, toiletVisits } from '../db/schema';
import { requireUser } from '../lib/auth';
import { logger } from '../lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
const router = Router();

// Self-healing
db.execute(sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS has_toilet boolean NOT NULL DEFAULT false`).catch(() => {});
db.execute(sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS toilet_fee_cents integer NOT NULL DEFAULT 150`).catch(() => {});
db.execute(sql`
  CREATE TABLE IF NOT EXISTS toilet_visits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    business_id INTEGER NOT NULL REFERENCES businesses(id),
    fee_cents INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    stripe_payment_intent_id TEXT,
    paid BOOLEAN NOT NULL DEFAULT false,
    access_code TEXT,
    rating INTEGER,
    review_note TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(() => {});

function generateAccessCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// POST /api/toilets/visit — initiate a toilet visit
// body: { business_id, payment_method: 'stripe' | 'ad_balance' }
router.post('/visit', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const { business_id, payment_method } = req.body;
  if (!business_id || !['stripe', 'ad_balance'].includes(payment_method)) {
    res.status(400).json({ error: 'business_id and payment_method (stripe|ad_balance) required' });
    return;
  }
  try {
    const [biz] = await db.select({ id: businesses.id, has_toilet: businesses.has_toilet, toilet_fee_cents: businesses.toilet_fee_cents })
      .from(businesses).where(eq(businesses.id, business_id));
    if (!biz?.has_toilet) { res.status(404).json({ error: 'no_toilet' }); return; }

    const feeCents = biz.toilet_fee_cents;

    if (payment_method === 'ad_balance') {
      // Atomic deduction — only succeeds if balance is sufficient
      const deducted = await db.update(users)
        .set({ ad_balance_cents: sql`${users.ad_balance_cents} - ${feeCents}` })
        .where(and(eq(users.id, userId), sql`${users.ad_balance_cents} >= ${feeCents}`))
        .returning({ ad_balance_cents: users.ad_balance_cents });
      if (!deducted.length) {
        res.status(402).json({ error: 'insufficient_balance' }); return;
      }
      const code = generateAccessCode();
      const [visit] = await db.insert(toiletVisits).values({
        user_id: userId,
        business_id,
        fee_cents: feeCents,
        payment_method: 'ad_balance',
        paid: true,
        access_code: code,
      }).returning();
      res.json({ visit_id: visit.id, access_code: code, fee_cents: feeCents });
    } else {
      // Stripe path — create payment intent, confirm via webhook
      const [visit] = await db.insert(toiletVisits).values({
        user_id: userId,
        business_id,
        fee_cents: feeCents,
        payment_method: 'stripe',
        paid: false,
      }).returning();
      const pi = await stripe.paymentIntents.create({
        amount: feeCents,
        currency: 'cad',
        metadata: { type: 'toilet_visit', visit_id: String(visit.id), user_id: String(userId) },
      });
      await db.update(toiletVisits)
        .set({ stripe_payment_intent_id: pi.id })
        .where(eq(toiletVisits.id, visit.id));
      res.json({ visit_id: visit.id, client_secret: pi.client_secret, fee_cents: feeCents });
    }
  } catch (err) {
    logger.error(`Toilet visit error: ${String(err)}`);
    res.status(500).json({ error: 'internal' });
  }
});

// POST /api/toilets/visits/:id/confirm — called after Stripe payment sheet succeeds
// (also handled via webhook; this is the client-side confirmation fallback)
router.post('/visits/:id/confirm', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const visitId = parseInt(req.params.id, 10);
  if (isNaN(visitId)) { res.status(400).json({ error: 'invalid id' }); return; }
  try {
    const [visit] = await db.select().from(toiletVisits)
      .where(and(eq(toiletVisits.id, visitId), eq(toiletVisits.user_id, userId)));
    if (!visit) { res.status(404).json({ error: 'not found' }); return; }
    if (visit.paid && visit.access_code) {
      res.json({ access_code: visit.access_code }); return;
    }
    if (!visit.stripe_payment_intent_id) { res.status(400).json({ error: 'no_payment_intent' }); return; }
    const pi = await stripe.paymentIntents.retrieve(visit.stripe_payment_intent_id);
    if (pi.status !== 'succeeded') { res.status(402).json({ error: 'not_paid' }); return; }
    const code = generateAccessCode();
    await db.update(toiletVisits).set({ paid: true, access_code: code })
      .where(eq(toiletVisits.id, visitId));
    res.json({ access_code: code });
  } catch (err) {
    logger.error(`Toilet confirm error: ${String(err)}`);
    res.status(500).json({ error: 'internal' });
  }
});

// POST /api/toilets/visits/:id/review
router.post('/visits/:id/review', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const visitId = parseInt(req.params.id, 10);
  const { rating, note } = req.body;
  if (isNaN(visitId) || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'rating (1-5) required' }); return;
  }
  try {
    const [visit] = await db.select({ id: toiletVisits.id, paid: toiletVisits.paid, reviewed_at: toiletVisits.reviewed_at })
      .from(toiletVisits)
      .where(and(eq(toiletVisits.id, visitId), eq(toiletVisits.user_id, userId)));
    if (!visit) { res.status(404).json({ error: 'not found' }); return; }
    if (!visit.paid) { res.status(402).json({ error: 'not_paid' }); return; }
    if (visit.reviewed_at) { res.status(409).json({ error: 'already_reviewed' }); return; }
    await db.update(toiletVisits).set({
      rating,
      review_note: note?.trim() || null,
      reviewed_at: new Date(),
    }).where(eq(toiletVisits.id, visitId));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// GET /api/toilets/reviews/:businessId
router.get('/reviews/:businessId', async (req: Request, res: Response) => {
  const businessId = parseInt(req.params.businessId, 10);
  if (isNaN(businessId)) { res.status(400).json({ error: 'invalid id' }); return; }
  try {
    const [summary] = await db.select({
      avg_rating: avg(toiletVisits.rating),
      review_count: count(toiletVisits.id),
    }).from(toiletVisits)
      .where(and(eq(toiletVisits.business_id, businessId), sql`${toiletVisits.rating} IS NOT NULL`));

    const recent = await db.select({
      id: toiletVisits.id,
      rating: toiletVisits.rating,
      review_note: toiletVisits.review_note,
      reviewed_at: toiletVisits.reviewed_at,
    }).from(toiletVisits)
      .where(and(eq(toiletVisits.business_id, businessId), sql`${toiletVisits.rating} IS NOT NULL`))
      .orderBy(desc(toiletVisits.reviewed_at))
      .limit(5);

    res.json({
      avg_rating: summary?.avg_rating ? parseFloat(String(summary.avg_rating)) : null,
      review_count: Number(summary?.review_count ?? 0),
      reviews: recent,
    });
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
