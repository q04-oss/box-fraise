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
  CREATE TABLE IF NOT EXISTS date_offers (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    seats INTEGER NOT NULL DEFAULT 2,
    budget_cents INTEGER NOT NULL,
    fee_per_view_cents INTEGER NOT NULL DEFAULT 500,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`).catch(() => {});

db.execute(sql`
  CREATE TABLE IF NOT EXISTS date_invitations (
    id SERIAL PRIMARY KEY,
    offer_id INTEGER NOT NULL REFERENCES date_offers(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    opened_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending',
    fee_cents INTEGER NOT NULL DEFAULT 500,
    UNIQUE(offer_id, user_id)
  )
`).catch(() => {});

db.execute(sql`
  CREATE TABLE IF NOT EXISTS date_matches (
    id SERIAL PRIMARY KEY,
    offer_id INTEGER NOT NULL REFERENCES date_offers(id),
    user_a_id INTEGER NOT NULL REFERENCES users(id),
    user_b_id INTEGER NOT NULL REFERENCES users(id),
    matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'confirmed'
  )
`).catch(() => {});

db.execute(sql`
  CREATE TABLE IF NOT EXISTS memory_requests (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES date_matches(id),
    user_a_id INTEGER NOT NULL REFERENCES users(id),
    user_b_id INTEGER NOT NULL REFERENCES users(id),
    event_date TIMESTAMPTZ NOT NULL,
    user_a_wants BOOLEAN,
    user_b_wants BOOLEAN,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`).catch(() => {});

db.execute(sql`
  CREATE TABLE IF NOT EXISTS business_promotions (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id),
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    fee_per_read_cents INTEGER NOT NULL DEFAULT 200,
    budget_cents INTEGER NOT NULL,
    spent_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`).catch(() => {});

db.execute(sql`
  CREATE TABLE IF NOT EXISTS promotion_deliveries (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER NOT NULL REFERENCES business_promotions(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    fee_cents INTEGER NOT NULL DEFAULT 200,
    UNIQUE(promotion_id, user_id)
  )
`).catch(() => {});

db.execute(sql`
  CREATE TABLE IF NOT EXISTS user_earnings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`).catch(() => {});

db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS open_to_dates BOOLEAN NOT NULL DEFAULT false`).catch(() => {});

// ── Rank helper for dispatch ordering ────────────────────────────────────────

function rankedOptedInUsers(limit: number) {
  return sql`
    WITH holdings AS (
      SELECT user_id,
             SUM(quantity * EXTRACT(EPOCH FROM (now() - purchased_at)) / 86400.0) AS score
      FROM akene_purchases WHERE confirmed = true GROUP BY user_id
    )
    SELECT u.id, u.push_token
    FROM users u
    LEFT JOIN holdings h ON h.user_id = u.id
    WHERE u.open_to_dates = true AND u.verified = true
    ORDER BY COALESCE(h.score, 0) DESC
    LIMIT ${limit}
  `;
}

// ── POST /dates/offers ────────────────────────────────────────────────────────

router.post('/offers', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const { title, description, event_date, budget_cents, fee_per_view_cents, business_id } = req.body;
  if (!title || !event_date || !budget_cents) {
    res.status(400).json({ error: 'title, event_date, budget_cents required' }); return;
  }
  try {
    const shopRow = ((await db.execute(sql`
      SELECT id FROM users WHERE id = ${userId} AND is_shop = true
    `)) as any).rows?.[0];
    if (!shopRow) { res.status(403).json({ error: 'shop access required' }); return; }

    const rows = await db.execute(sql`
      INSERT INTO date_offers (created_by_user_id, business_id, title, description, event_date,
                               budget_cents, fee_per_view_cents)
      VALUES (${userId}, ${business_id ?? null}, ${title}, ${description ?? null},
              ${event_date}, ${budget_cents}, ${fee_per_view_cents ?? 500})
      RETURNING id, title, description, event_date, budget_cents, fee_per_view_cents, status
    `);
    res.status(201).json(((rows as any).rows ?? rows)[0]);
  } catch (err) {
    logger.error('dates/offers POST: ' + String(err));
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /dates/offers/:id/dispatch ──────────────────────────────────────────

router.post('/offers/:id/dispatch', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const offerId = parseInt(req.params.id);
  try {
    const shopRow = ((await db.execute(sql`
      SELECT id FROM users WHERE id = ${userId} AND is_shop = true
    `)) as any).rows?.[0];
    if (!shopRow) { res.status(403).json({ error: 'shop access required' }); return; }

    const offer = ((await db.execute(sql`
      SELECT budget_cents, fee_per_view_cents FROM date_offers WHERE id = ${offerId}
    `)) as any).rows?.[0];
    if (!offer) { res.status(404).json({ error: 'offer not found' }); return; }

    const maxInvites = Math.floor(offer.budget_cents / offer.fee_per_view_cents);
    const targets = ((await db.execute(rankedOptedInUsers(maxInvites))) as any).rows ?? [];

    let sent = 0;
    for (const t of targets) {
      try {
        await db.execute(sql`
          INSERT INTO date_invitations (offer_id, user_id, fee_cents)
          VALUES (${offerId}, ${t.id}, ${offer.fee_per_view_cents})
          ON CONFLICT (offer_id, user_id) DO NOTHING
        `);
        sent++;
        if (t.push_token) {
          sendPushNotification(t.push_token, {
            title: 'a dinner invitation',
            body: 'a business is hosting a date night — open to earn a fee and see details.',
            data: { screen: 'offers' },
          }).catch(() => {});
        }
      } catch {}
    }
    res.json({ sent });
  } catch (err) {
    logger.error('dates/dispatch: ' + String(err));
    res.status(500).json({ error: 'internal' });
  }
});

// ── GET /dates/invitations ────────────────────────────────────────────────────

router.get('/invitations', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  try {
    const rows = await db.execute(sql`
      SELECT
        di.id, di.status, di.sent_at, di.opened_at, di.fee_cents,
        do2.id AS offer_id, do2.title, do2.description, do2.event_date,
        do2.fee_per_view_cents,
        b.name AS business_name, b.address AS business_address,
        b.neighbourhood AS business_neighbourhood
      FROM date_invitations di
      JOIN date_offers do2 ON do2.id = di.offer_id
      LEFT JOIN businesses b ON b.id = do2.business_id
      WHERE di.user_id = ${userId}
      ORDER BY di.sent_at DESC
    `);
    res.json(((rows as any).rows ?? rows).map((r: any) => ({
      id:                    r.id,
      status:                r.status,
      sentAt:                r.sent_at,
      openedAt:              r.opened_at,
      feeCents:              r.fee_cents,
      offerId:               r.offer_id,
      title:                 r.title,
      description:           r.description,
      eventDate:             r.event_date,
      businessName:          r.business_name,
      businessAddress:       r.business_address,
      businessNeighbourhood: r.business_neighbourhood,
    })));
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /dates/invitations/:id/open ─────────────────────────────────────────

router.post('/invitations/:id/open', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const id = parseInt(req.params.id);
  try {
    const inv = ((await db.execute(sql`
      SELECT di.id, di.status, di.opened_at, di.fee_cents, di.offer_id
      FROM date_invitations di WHERE di.id = ${id} AND di.user_id = ${userId}
    `)) as any).rows?.[0];
    if (!inv) { res.status(404).json({ error: 'not found' }); return; }

    if (!inv.opened_at) {
      await db.execute(sql`
        UPDATE date_invitations SET opened_at = now(), status = 'opened'
        WHERE id = ${id} AND user_id = ${userId}
      `);
      await db.execute(sql`
        INSERT INTO user_earnings (user_id, source_type, source_id, amount_cents)
        VALUES (${userId}, 'date_invitation', ${id}, ${inv.fee_cents})
      `);
    }
    res.json({ ok: true, earned: !inv.opened_at, feeCents: inv.fee_cents });
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /dates/invitations/:id/accept ───────────────────────────────────────

router.post('/invitations/:id/accept', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const id = parseInt(req.params.id);
  try {
    const inv = ((await db.execute(sql`
      SELECT di.id, di.status, di.offer_id, di.fee_cents, di.opened_at,
             do2.seats, do2.event_date
      FROM date_invitations di
      JOIN date_offers do2 ON do2.id = di.offer_id
      WHERE di.id = ${id} AND di.user_id = ${userId}
    `)) as any).rows?.[0];
    if (!inv)                    { res.status(404).json({ error: 'not found' }); return; }
    if (inv.status === 'matched') { res.status(409).json({ error: 'already matched' }); return; }

    // Pay view fee on accept if not already opened
    if (!inv.opened_at) {
      await db.execute(sql`
        INSERT INTO user_earnings (user_id, source_type, source_id, amount_cents)
        VALUES (${userId}, 'date_invitation', ${id}, ${inv.fee_cents})
        ON CONFLICT DO NOTHING
      `);
    }

    await db.execute(sql`
      UPDATE date_invitations SET status = 'accepted', responded_at = now()
      WHERE id = ${id} AND user_id = ${userId}
    `);

    // Check if we have enough acceptors to form a match
    const acceptors = ((await db.execute(sql`
      SELECT user_id FROM date_invitations
      WHERE offer_id = ${inv.offer_id} AND status = 'accepted'
      ORDER BY responded_at ASC LIMIT ${inv.seats}
    `)) as any).rows ?? [];

    if (acceptors.length >= inv.seats) {
      const [ua, ub] = [acceptors[0].user_id, acceptors[1].user_id];

      const matchRows = await db.execute(sql`
        INSERT INTO date_matches (offer_id, user_a_id, user_b_id)
        VALUES (${inv.offer_id}, ${ua}, ${ub})
        RETURNING id
      `);
      const matchId = ((matchRows as any).rows ?? matchRows)[0]?.id;

      // Mark both as matched
      await db.execute(sql`
        UPDATE date_invitations SET status = 'matched'
        WHERE offer_id = ${inv.offer_id} AND user_id IN (${ua}, ${ub})
      `);

      // Create memory request (prompt available 48h after event_date)
      await db.execute(sql`
        INSERT INTO memory_requests (match_id, user_a_id, user_b_id, event_date)
        VALUES (${matchId}, ${ua}, ${ub}, ${inv.event_date})
      `);

      // Notify both matched users
      const pushRows = ((await db.execute(sql`
        SELECT id, push_token FROM users WHERE id IN (${ua}, ${ub})
      `)) as any).rows ?? [];
      for (const u of pushRows) {
        if (u.push_token) {
          sendPushNotification(u.push_token, {
            title: 'you\'ve been matched',
            body: 'dinner is confirmed. see you there.',
            data: { screen: 'offers' },
          }).catch(() => {});
        }
      }
      res.json({ ok: true, matched: true });
    } else {
      res.json({ ok: true, matched: false });
    }
  } catch (err) {
    logger.error('dates/accept: ' + String(err));
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /dates/invitations/:id/decline ──────────────────────────────────────

router.post('/invitations/:id/decline', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const id = parseInt(req.params.id);
  try {
    await db.execute(sql`
      UPDATE date_invitations SET status = 'declined', responded_at = now()
      WHERE id = ${id} AND user_id = ${userId} AND status IN ('pending', 'opened')
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── GET /dates/memory ─────────────────────────────────────────────────────────
// Returns memory requests where 48h have passed since the dinner and
// the current user hasn't responded yet.

router.get('/memory', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  try {
    const rows = await db.execute(sql`
      SELECT mr.id, mr.match_id, mr.event_date, mr.created_at,
             mr.user_a_wants, mr.user_b_wants, mr.resolved_at,
             CASE WHEN mr.user_a_id = ${userId} THEN mr.user_b_id ELSE mr.user_a_id END AS their_id,
             u.display_name AS their_name,
             do2.title AS offer_title, b.name AS business_name
      FROM memory_requests mr
      JOIN users u ON u.id = (CASE WHEN mr.user_a_id = ${userId} THEN mr.user_b_id ELSE mr.user_a_id END)
      JOIN date_matches dm ON dm.id = mr.match_id
      JOIN date_offers do2 ON do2.id = dm.offer_id
      LEFT JOIN businesses b ON b.id = do2.business_id
      WHERE (mr.user_a_id = ${userId} OR mr.user_b_id = ${userId})
        AND mr.resolved_at IS NULL
        AND mr.event_date + INTERVAL '48 hours' < now()
        AND (
          (mr.user_a_id = ${userId} AND mr.user_a_wants IS NULL) OR
          (mr.user_b_id = ${userId} AND mr.user_b_wants IS NULL)
        )
      ORDER BY mr.event_date DESC
    `);
    res.json(((rows as any).rows ?? rows).map((r: any) => ({
      id:           r.id,
      matchId:      r.match_id,
      eventDate:    r.event_date,
      theirName:    r.their_name,
      offerTitle:   r.offer_title,
      businessName: r.business_name,
    })));
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /dates/memory/:id/respond ───────────────────────────────────────────

router.post('/memory/:id/respond', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const id = parseInt(req.params.id);
  const { wants } = req.body;
  if (typeof wants !== 'boolean') { res.status(400).json({ error: 'wants (boolean) required' }); return; }
  try {
    const mr = ((await db.execute(sql`
      SELECT id, user_a_id, user_b_id, user_a_wants, user_b_wants, match_id
      FROM memory_requests WHERE id = ${id}
        AND (user_a_id = ${userId} OR user_b_id = ${userId})
    `)) as any).rows?.[0];
    if (!mr) { res.status(404).json({ error: 'not found' }); return; }

    const isA = mr.user_a_id === userId;
    if (isA) {
      await db.execute(sql`UPDATE memory_requests SET user_a_wants = ${wants} WHERE id = ${id}`);
    } else {
      await db.execute(sql`UPDATE memory_requests SET user_b_wants = ${wants} WHERE id = ${id}`);
    }

    // Re-fetch to check if both responded
    const updated = ((await db.execute(sql`
      SELECT user_a_wants, user_b_wants, user_a_id, user_b_id
      FROM memory_requests WHERE id = ${id}
    `)) as any).rows?.[0];

    const bothWant = updated.user_a_wants === true && updated.user_b_wants === true;
    const resolved = updated.user_a_wants !== null && updated.user_b_wants !== null;

    if (resolved) {
      await db.execute(sql`UPDATE memory_requests SET resolved_at = now() WHERE id = ${id}`);
    }

    if (bothWant) {
      // Create a connection + open messaging between the two
      const [ua, ub] = updated.user_a_id < updated.user_b_id
        ? [updated.user_a_id, updated.user_b_id]
        : [updated.user_b_id, updated.user_a_id];
      await db.execute(sql`
        INSERT INTO connections (user_a_id, user_b_id, met_at)
        VALUES (${ua}, ${ub}, now()) ON CONFLICT DO NOTHING
      `);

      // Tick business memory count (via match → offer → business)
      await db.execute(sql`
        UPDATE date_offers SET status = 'memory_made'
        WHERE id = (SELECT offer_id FROM date_matches WHERE id = ${mr.match_id})
          AND status != 'memory_made'
      `);

      // Notify both
      const pushRows = ((await db.execute(sql`
        SELECT push_token FROM users WHERE id IN (${updated.user_a_id}, ${updated.user_b_id})
      `)) as any).rows ?? [];
      for (const u of pushRows) {
        if (u.push_token) {
          sendPushNotification(u.push_token, {
            title: 'memory made',
            body: 'you both want to remember. you can message each other now.',
            data: { screen: 'messages' },
          }).catch(() => {});
        }
      }
    }

    res.json({ ok: true, bothWant, resolved });
  } catch (err) {
    logger.error('dates/memory/respond: ' + String(err));
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /dates/promotions ────────────────────────────────────────────────────

router.post('/promotions', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const { title, body, fee_per_read_cents, budget_cents, business_id } = req.body;
  if (!title || !body || !budget_cents || !business_id) {
    res.status(400).json({ error: 'title, body, budget_cents, business_id required' }); return;
  }
  try {
    const shopRow = ((await db.execute(sql`
      SELECT id FROM users WHERE id = ${userId} AND is_shop = true
    `)) as any).rows?.[0];
    if (!shopRow) { res.status(403).json({ error: 'shop access required' }); return; }

    const rows = await db.execute(sql`
      INSERT INTO business_promotions (business_id, created_by_user_id, title, body,
                                       fee_per_read_cents, budget_cents)
      VALUES (${business_id}, ${userId}, ${title}, ${body},
              ${fee_per_read_cents ?? 200}, ${budget_cents})
      RETURNING id, title, status
    `);
    res.status(201).json(((rows as any).rows ?? rows)[0]);
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /dates/promotions/:id/dispatch ──────────────────────────────────────

router.post('/promotions/:id/dispatch', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const promoId = parseInt(req.params.id);
  try {
    const shopRow = ((await db.execute(sql`
      SELECT id FROM users WHERE id = ${userId} AND is_shop = true
    `)) as any).rows?.[0];
    if (!shopRow) { res.status(403).json({ error: 'shop access required' }); return; }

    const promo = ((await db.execute(sql`
      SELECT budget_cents, fee_per_read_cents, spent_cents FROM business_promotions
      WHERE id = ${promoId}
    `)) as any).rows?.[0];
    if (!promo) { res.status(404).json({ error: 'not found' }); return; }

    const remaining = promo.budget_cents - promo.spent_cents;
    const maxSends = Math.floor(remaining / promo.fee_per_read_cents);
    const targets = ((await db.execute(rankedOptedInUsers(maxSends))) as any).rows ?? [];

    let sent = 0;
    for (const t of targets) {
      try {
        await db.execute(sql`
          INSERT INTO promotion_deliveries (promotion_id, user_id, fee_cents)
          VALUES (${promoId}, ${t.id}, ${promo.fee_per_read_cents})
          ON CONFLICT (promotion_id, user_id) DO NOTHING
        `);
        sent++;
        if (t.push_token) {
          sendPushNotification(t.push_token, {
            title: 'a message for you',
            body: 'a business left something in your offers. earn a fee to read it.',
            data: { screen: 'offers' },
          }).catch(() => {});
        }
      } catch {}
    }
    res.json({ sent });
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── GET /dates/promotions ─────────────────────────────────────────────────────

router.get('/promotions', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  try {
    const rows = await db.execute(sql`
      SELECT pd.id, pd.delivered_at, pd.read_at, pd.fee_cents,
             bp.id AS promotion_id, bp.title, bp.body,
             b.name AS business_name
      FROM promotion_deliveries pd
      JOIN business_promotions bp ON bp.id = pd.promotion_id
      JOIN businesses b ON b.id = bp.business_id
      WHERE pd.user_id = ${userId}
      ORDER BY pd.delivered_at DESC
    `);
    res.json(((rows as any).rows ?? rows).map((r: any) => ({
      id:           r.id,
      deliveredAt:  r.delivered_at,
      readAt:       r.read_at,
      feeCents:     r.fee_cents,
      promotionId:  r.promotion_id,
      title:        r.title,
      body:         r.body,
      businessName: r.business_name,
    })));
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── POST /dates/promotions/:id/read ──────────────────────────────────────────

router.post('/promotions/:id/read', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const id = parseInt(req.params.id);
  try {
    const pd = ((await db.execute(sql`
      SELECT pd.id, pd.read_at, pd.fee_cents, pd.promotion_id
      FROM promotion_deliveries pd WHERE pd.id = ${id} AND pd.user_id = ${userId}
    `)) as any).rows?.[0];
    if (!pd) { res.status(404).json({ error: 'not found' }); return; }

    if (!pd.read_at) {
      await db.execute(sql`
        UPDATE promotion_deliveries SET read_at = now() WHERE id = ${id}
      `);
      await db.execute(sql`
        UPDATE business_promotions SET spent_cents = spent_cents + ${pd.fee_cents}
        WHERE id = ${pd.promotion_id}
      `);
      await db.execute(sql`
        INSERT INTO user_earnings (user_id, source_type, source_id, amount_cents)
        VALUES (${userId}, 'promotion', ${id}, ${pd.fee_cents})
      `);
    }
    res.json({ ok: true, earned: !pd.read_at, feeCents: pd.fee_cents });
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── GET /dates/earnings ───────────────────────────────────────────────────────

router.get('/earnings', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  try {
    const rows = await db.execute(sql`
      SELECT id, source_type, source_id, amount_cents, created_at
      FROM user_earnings WHERE user_id = ${userId}
      ORDER BY created_at DESC LIMIT 50
    `);
    const history = (rows as any).rows ?? rows;
    const balance = history.reduce((sum: number, r: any) => sum + r.amount_cents, 0);
    res.json({
      balanceCents: balance,
      history: history.map((r: any) => ({
        id: r.id, sourceType: r.source_type, amountCents: r.amount_cents, createdAt: r.created_at,
      })),
    });
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── GET /dates/business/:id/stats ────────────────────────────────────────────

router.get('/business/:id/stats', async (req: Request, res: Response) => {
  const bizId = parseInt(req.params.id);
  try {
    const row = ((await db.execute(sql`
      SELECT COUNT(*)::int AS memories_count
      FROM memory_requests mr
      JOIN date_matches dm ON dm.id = mr.match_id
      JOIN date_offers do2 ON do2.id = dm.offer_id
      WHERE do2.business_id = ${bizId}
        AND mr.user_a_wants = true AND mr.user_b_wants = true
    `)) as any).rows?.[0];
    res.json({ memoriesCount: row?.memories_count ?? 0 });
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

// ── PATCH /dates/opt-in ───────────────────────────────────────────────────────

router.patch('/opt-in', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const { open } = req.body;
  if (typeof open !== 'boolean') { res.status(400).json({ error: 'open (boolean) required' }); return; }
  try {
    await db.execute(sql`UPDATE users SET open_to_dates = ${open} WHERE id = ${userId}`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
