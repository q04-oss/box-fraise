import { Router, Request, Response } from 'express';
import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '../db';
import { memberships, membershipFunds, users } from '../db/schema';
import { requireUser } from '../lib/auth';
import { stripe } from '../lib/stripe';
import { TIER_AMOUNTS, STRIPE_PAYABLE_TIERS } from '../lib/membership';

// ─── Memberships router ───────────────────────────────────────────────────────

export const membershipsRouter = Router();

// POST /api/memberships/payment-intent
membershipsRouter.post('/payment-intent', requireUser, async (req: Request, res: Response) => {
  const userId: number = (req as any).userId;
  const { tier } = req.body;

  if (!tier || !(tier in TIER_AMOUNTS)) {
    res.status(400).json({ error: 'invalid_tier' });
    return;
  }

  if (!STRIPE_PAYABLE_TIERS.includes(tier)) {
    res.status(409).json({ error: 'contact_us', message: 'Please contact us to arrange payment for this tier.' });
    return;
  }

  try {
    // Check user doesn't already have an active membership
    const [existing] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.user_id, userId), eq(memberships.status, 'active')))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: 'already_active' });
      return;
    }

    const amount_cents = TIER_AMOUNTS[tier];

    const pi = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'cad',
      metadata: { type: 'membership', tier, user_id: String(userId) },
    });

    await db.insert(memberships).values({
      user_id: userId,
      tier: tier as any,
      status: 'pending',
      amount_cents,
      stripe_payment_intent_id: pi.id,
    });

    res.json({ client_secret: pi.client_secret, tier, amount_cents });
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/memberships/me
membershipsRouter.get('/me', requireUser, async (req: Request, res: Response) => {
  const userId: number = (req as any).userId;

  try {
    const [membership] = await db
      .select({
        tier: memberships.tier,
        status: memberships.status,
        started_at: memberships.started_at,
        renews_at: memberships.renews_at,
        amount_cents: memberships.amount_cents,
      })
      .from(memberships)
      .where(and(eq(memberships.user_id, userId), eq(memberships.status, 'active')))
      .limit(1);

    const [fund] = await db
      .select({ balance_cents: membershipFunds.balance_cents, cycle_start: membershipFunds.cycle_start })
      .from(membershipFunds)
      .where(eq(membershipFunds.user_id, userId))
      .limit(1);

    res.json({
      membership: membership ?? null,
      fund: fund ? { balance_cents: fund.balance_cents, cycle_start: fund.cycle_start } : { balance_cents: 0 },
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});

// ─── Members router (public — GET /api/members) ───────────────────────────────

export const membersRouter = Router();

membersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        user_id: memberships.user_id,
        display_name: users.display_name,
        tier: memberships.tier,
        started_at: memberships.started_at,
      })
      .from(memberships)
      .leftJoin(users, eq(memberships.user_id, users.id))
      .where(eq(memberships.status, 'active'))
      .orderBy(desc(memberships.tier), asc(memberships.started_at));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});

// ─── Fund router ──────────────────────────────────────────────────────────────

export const fundRouter = Router();

// POST /api/fund/contribute/:userId
fundRouter.post('/contribute/:userId', async (req: Request, res: Response) => {
  const toUserId = parseInt(req.params.userId, 10);
  if (isNaN(toUserId)) {
    res.status(400).json({ error: 'invalid_user_id' });
    return;
  }

  const { amount_cents, note, anonymous } = req.body;

  if (!amount_cents || typeof amount_cents !== 'number' || amount_cents < 100) {
    res.status(400).json({ error: 'minimum_amount', message: 'Minimum contribution is $1 (100 cents).' });
    return;
  }

  // Determine from_user_id from auth header if present (optional auth)
  let fromUserId: number | null = null;
  const auth = req.headers['authorization'];
  if (auth?.startsWith('Bearer ')) {
    const { verifyToken } = await import('../lib/auth');
    const payload = verifyToken(auth.slice(7));
    if (payload) fromUserId = payload.userId;
  } else {
    const uid = parseInt(req.headers['x-user-id'] as string ?? '', 10);
    if (!isNaN(uid)) fromUserId = uid;
  }

  const isAnonymous = anonymous === true;

  try {
    const pi = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'cad',
      metadata: {
        type: 'fund_contribution',
        to_user_id: String(toUserId),
        from_user_id: isAnonymous ? '' : (fromUserId !== null ? String(fromUserId) : ''),
        note: note ?? '',
      },
    });

    res.json({ client_secret: pi.client_secret });
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});
