import { Router, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { requireUser } from '../lib/auth';
import { stripe } from '../lib/stripe';
import { sendPushNotification } from '../lib/push';
import { logger } from '../lib/logger';

const router = Router();

// ── Schema ────────────────────────────────────────────────────────────────────

db.execute(sql`
  CREATE TABLE IF NOT EXISTS akene_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    amount_cents INTEGER NOT NULL,
    stripe_payment_intent_id TEXT UNIQUE,
    confirmed BOOLEAN NOT NULL DEFAULT false,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`).catch(() => {});

db.execute(sql`
  CREATE TABLE IF NOT EXISTS akene_events (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    created_by_user_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ,
    capacity INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'inviting',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`).catch(() => {});

db.execute(sql`
  CREATE TABLE IF NOT EXISTS akene_invitations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES akene_events(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending',
    UNIQUE(event_id, user_id)
  )
`).catch(() => {});

// ── Rank helper ───────────────────────────────────────────────────────────────
// rank_score = Σ(quantity × days_held) × (1 + events_attended × 0.1)
// Rewards holding more akène for longer and attending more events.

const rankCte = sql`
  WITH holdings AS (
    SELECT user_id,
           SUM(quantity) AS akene_held,
           SUM(quantity * EXTRACT(EPOCH FROM (now() - purchased_at)) / 86400.0) AS time_score
    FROM akene_purchases
    WHERE confirmed = true
    GROUP BY user_id
  ),
  attended AS (
    SELECT user_id, COUNT(*) AS events_attended
    FROM akene_invitations
    WHERE status = 'accepted'
    GROUP BY user_id
  )
  SELECT
    u.id,
    u.display_name,
    COALESCE(h.akene_held, 0)::int                                        AS akene_held,
    COALESCE(a.events_attended, 0)::int                                   AS events_attended,
    ROUND(
      COALESCE(h.time_score, 0) * (1 + COALESCE(a.events_attended, 0) * 0.1)
    )::bigint                                                              AS rank_score
  FROM users u
  JOIN holdings h ON h.user_id = u.id
  LEFT JOIN attended a ON a.user_id = u.id
  ORDER BY rank_score DESC
`;

// ── GET /api/akene/my ─────────────────────────────────────────────────────────

router.get('/my', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  try {
    const rows = await db.execute(sql`
      WITH ranked AS (${rankCte})
      SELECT *, ROW_NUMBER() OVER () AS rank_position
      FROM ranked
    `);
    const all = (rows as any).rows ?? rows;
    const mine = all.find((r: any) => r.id === userId);

    if (!mine) {
      return res.json({ akeneHeld: 0, rankScore: 0, rankPosition: null, eventsAttended: 0 });
    }

    const pos = all.findIndex((r: any) => r.id === userId) + 1;
    res.json({
      akeneHeld:      mine.akene_held,
      eventsAttended: mine.events_attended,
      rankScore:      mine.rank_score,
      rankPosition:   pos,
      totalHolders:   all.length,
    });
  } catch (err) {
    logger.error('akene/my: ' + String(err));
    res.status(500).json({ error: 'internal' });
  }
});

// ── GET /api/akene/leaderboard ────────────────────────────────────────────────

router.get('/leaderboard', requireUser, async (req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`
      WITH ranked AS (${rankCte})
      SELECT display_name, akene_held, events_attended, rank_score,
             ROW_NUMBER() OVER () AS rank_position
      FROM ranked
      LIMIT 100
    `);
    res.json((rows as any).rows ?? rows);
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /api/akene/purchase ──────────────────────────────────────────────────
// Creates a Stripe payment intent for one or more akène (CA$120 each).

router.post('/purchase', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const quantity = Math.max(1, Math.min(10, parseInt(req.body.quantity) || 1));
  const amountCents = quantity * 12000;
  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
      metadata: { user_id: String(userId), quantity: String(quantity), type: 'akene' },
    });
    await db.execute(sql`
      INSERT INTO akene_purchases (user_id, quantity, amount_cents, stripe_payment_intent_id)
      VALUES (${userId}, ${quantity}, ${amountCents}, ${intent.id})
    `);
    res.json({ clientSecret: intent.client_secret, quantity, amountCents });
  } catch (err) {
    logger.error('akene/purchase: ' + String(err));
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /api/akene/purchase/confirm ─────────────────────────────────────────
// Called by iOS after StripePaymentSheet reports .completed.

router.post('/purchase/confirm', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const { payment_intent_id } = req.body;
  if (!payment_intent_id) { res.status(400).json({ error: 'payment_intent_id required' }); return; }
  try {
    const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (intent.status !== 'succeeded') {
      res.status(402).json({ error: 'payment not confirmed' }); return;
    }
    await db.execute(sql`
      UPDATE akene_purchases SET confirmed = true
      WHERE stripe_payment_intent_id = ${payment_intent_id}
        AND user_id = ${userId}
    `);
    res.json({ ok: true });
  } catch (err) {
    logger.error('akene/purchase/confirm: ' + String(err));
    res.status(500).json({ error: 'internal' });
  }
});

// ── GET /api/akene/invitations ────────────────────────────────────────────────

router.get('/invitations', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  try {
    const rows = await db.execute(sql`
      SELECT
        ai.id, ai.status, ai.sent_at, ai.responded_at,
        ae.id AS event_id, ae.title, ae.description,
        ae.event_date, ae.capacity, ae.status AS event_status,
        b.name AS business_name
      FROM akene_invitations ai
      JOIN akene_events ae ON ae.id = ai.event_id
      LEFT JOIN businesses b ON b.id = ae.business_id
      WHERE ai.user_id = ${userId}
      ORDER BY ai.sent_at DESC
    `);
    res.json((rows as any).rows ?? rows);
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /api/akene/invitations/:id/accept ────────────────────────────────────

router.post('/invitations/:id/accept', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const id = parseInt(req.params.id);
  try {
    const invRow = ((await db.execute(sql`
      SELECT ai.id, ai.status, ai.event_id, ae.capacity,
             (SELECT COUNT(*) FROM akene_invitations WHERE event_id = ai.event_id AND status = 'accepted') AS accepted_count
      FROM akene_invitations ai
      JOIN akene_events ae ON ae.id = ai.event_id
      WHERE ai.id = ${id} AND ai.user_id = ${userId}
      LIMIT 1
    `)) as any).rows?.[0];

    if (!invRow)                                  { res.status(404).json({ error: 'not found' }); return; }
    if (invRow.status !== 'pending')              { res.status(409).json({ error: 'already responded' }); return; }
    if (invRow.accepted_count >= invRow.capacity) { res.status(409).json({ error: 'event full' }); return; }

    await db.execute(sql`
      UPDATE akene_invitations
      SET status = 'accepted', responded_at = now()
      WHERE id = ${id} AND user_id = ${userId}
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /api/akene/invitations/:id/decline ───────────────────────────────────

router.post('/invitations/:id/decline', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const id = parseInt(req.params.id);
  try {
    await db.execute(sql`
      UPDATE akene_invitations
      SET status = 'declined', responded_at = now()
      WHERE id = ${id} AND user_id = ${userId} AND status = 'pending'
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /api/akene/events ────────────────────────────────────────────────────
// Staff / shop users create events and push invitations.

router.post('/events', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const { title, description, event_date, capacity, business_id } = req.body;
  if (!title || !capacity) { res.status(400).json({ error: 'title and capacity required' }); return; }
  try {
    const shopRow = ((await db.execute(sql`
      SELECT id FROM users WHERE id = ${userId} AND (is_shop = true OR is_dorotka = true)
    `)) as any).rows?.[0];
    if (!shopRow) { res.status(403).json({ error: 'shop access required' }); return; }

    const rows = await db.execute(sql`
      INSERT INTO akene_events (created_by_user_id, business_id, title, description, event_date, capacity)
      VALUES (${userId}, ${business_id ?? null}, ${title}, ${description ?? null},
              ${event_date ?? null}, ${capacity})
      RETURNING id, title, description, event_date, capacity, status, created_at
    `);
    res.status(201).json(((rows as any).rows ?? rows)[0]);
  } catch (err) {
    logger.error('akene/events: ' + String(err));
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /api/akene/events/:id/invite ────────────────────────────────────────
// Push invitations to the top N ranked akène holders (or specify user_ids).

router.post('/events/:id/invite', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const eventId = parseInt(req.params.id);
  const { count = 20, user_ids } = req.body;

  try {
    const shopRow = ((await db.execute(sql`
      SELECT id FROM users WHERE id = ${userId} AND (is_shop = true OR is_dorotka = true)
    `)) as any).rows?.[0];
    if (!shopRow) { res.status(403).json({ error: 'shop access required' }); return; }

    let targets: { id: number; push_token: string | null }[];

    if (Array.isArray(user_ids) && user_ids.length > 0) {
      const rows = await db.execute(sql`
        SELECT id, push_token FROM users WHERE id = ANY(${user_ids}::int[])
      `);
      targets = (rows as any).rows ?? rows;
    } else {
      // Invite the top `count` akène holders by rank score
      const rows = await db.execute(sql`
        WITH ranked AS (
          SELECT user_id,
                 SUM(quantity * EXTRACT(EPOCH FROM (now() - purchased_at)) / 86400.0) AS score
          FROM akene_purchases WHERE confirmed = true
          GROUP BY user_id
          ORDER BY score DESC
          LIMIT ${count}
        )
        SELECT u.id, u.push_token
        FROM users u JOIN ranked r ON r.user_id = u.id
      `);
      targets = (rows as any).rows ?? rows;
    }

    let sent = 0;
    for (const t of targets) {
      try {
        await db.execute(sql`
          INSERT INTO akene_invitations (event_id, user_id)
          VALUES (${eventId}, ${t.id})
          ON CONFLICT (event_id, user_id) DO NOTHING
        `);
        sent++;
        if (t.push_token) {
          sendPushNotification(t.push_token, {
            title: 'you\'ve been invited',
            body: 'an evening is being planned. open box fraise to accept.',
            data: { screen: 'akene' },
          }).catch(() => {});
        }
      } catch {}
    }

    res.json({ sent });
  } catch (err) {
    logger.error('akene/invite: ' + String(err));
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
