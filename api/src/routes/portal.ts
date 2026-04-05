import { Router, Request, Response } from 'express';
import { eq, and, gt, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db';
import { explicitPortals, portalAccess, portalContent, portalConsents, users, memberships } from '../db/schema';
import { requireVerifiedUser } from '../lib/auth';
import { stripe } from '../lib/stripe';
import { calculateCut } from '../lib/portal';
import { sendPushNotification } from '../lib/push';

const router = Router();

// Self-healing: add identity verification columns if they don't exist yet
db.execute(sql`
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz,
    ADD COLUMN IF NOT EXISTS identity_session_id text,
    ADD COLUMN IF NOT EXISTS id_attested_by integer,
    ADD COLUMN IF NOT EXISTS id_attested_at timestamptz,
    ADD COLUMN IF NOT EXISTS id_attestation_expires_at timestamptz,
    ADD COLUMN IF NOT EXISTS id_verified_name text,
    ADD COLUMN IF NOT EXISTS id_verified_dob text,
    ADD COLUMN IF NOT EXISTS identity_verified_expires_at timestamptz
`).catch(() => {});

db.execute(sql`
  CREATE TABLE IF NOT EXISTS id_attestation_log (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    attested_by integer NOT NULL,
    attested_at timestamptz NOT NULL DEFAULT now(),
    outcome text NOT NULL DEFAULT 'pending',
    stripe_session_id text,
    id_verified_name text,
    id_verified_dob text
  )
`).catch(() => {});

// Shared opt-in logic
async function performOptIn(userId: number, ipAddress: string | undefined, res: Response): Promise<void> {
  try {
    // Upsert consent record
    await db.execute(sql`
      INSERT INTO portal_consents (user_id, ip_address)
      VALUES (${userId}, ${ipAddress ?? null})
      ON CONFLICT (user_id) DO UPDATE SET consented_at = now(), ip_address = ${ipAddress ?? null}
    `);

    // Upsert explicit_portals
    await db.execute(sql`
      INSERT INTO explicit_portals (user_id, opted_in)
      VALUES (${userId}, true)
      ON CONFLICT (user_id) DO UPDATE SET opted_in = true
    `);

    await db.update(users).set({ portal_opted_in: true }).where(eq(users.id, userId));

    const [consent] = await db.select({ consented_at: portalConsents.consented_at }).from(portalConsents).where(eq(portalConsents.user_id, userId)).limit(1);
    res.json({ ok: true, consented_at: consent?.consented_at ?? new Date() });
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
}

// POST /api/portal/consent — canonical opt-in path with consent record
router.post('/consent', requireVerifiedUser, async (req: Request, res: Response) => {
  const userId: number = (req as any).userId;
  const { confirmed } = req.body;
  if (confirmed !== true) {
    res.status(400).json({ error: 'confirmed must be true' });
    return;
  }
  await performOptIn(userId, req.ip, res);
});

// POST /api/portal/opt-in — alias for /consent (kept for backwards compat)
router.post('/opt-in', requireVerifiedUser, async (req: Request, res: Response) => {
  const userId: number = (req as any).userId;
  await performOptIn(userId, req.ip, res);
});

// POST /api/portal/request-access/:ownerId
router.post('/request-access/:ownerId', requireVerifiedUser, async (req: Request, res: Response) => {
  const buyerId: number = (req as any).userId;
  const ownerId = parseInt(req.params.ownerId, 10);

  if (isNaN(ownerId)) {
    res.status(400).json({ error: 'invalid_owner_id' });
    return;
  }

  const { source } = req.body;
  if (!source || !['tap', 'receipt'].includes(source)) {
    res.status(400).json({ error: 'invalid_source' });
    return;
  }

  try {
    // Validate owner exists and has portal opted in
    const [owner] = await db
      .select({ id: users.id, portal_opted_in: users.portal_opted_in })
      .from(users)
      .where(eq(users.id, ownerId))
      .limit(1);

    if (!owner) {
      res.status(404).json({ error: 'owner_not_found' });
      return;
    }

    if (!owner.portal_opted_in) {
      res.status(403).json({ error: 'owner_not_opted_in' });
      return;
    }

    // Check buyer doesn't already have valid (non-expired) access
    const now = new Date();
    const [existingAccess] = await db
      .select({ id: portalAccess.id })
      .from(portalAccess)
      .where(
        and(
          eq(portalAccess.buyer_id, buyerId),
          eq(portalAccess.owner_id, ownerId),
          gt(portalAccess.expires_at, now),
        ),
      )
      .limit(1);

    if (existingAccess) {
      res.status(409).json({ error: 'already_has_access' });
      return;
    }

    // Require government ID verification to subscribe (also check it hasn't expired)
    const [buyer] = await db
      .select({ identity_verified: users.identity_verified, identity_verified_expires_at: users.identity_verified_expires_at })
      .from(users)
      .where(eq(users.id, buyerId))
      .limit(1);

    const idExpired = buyer?.identity_verified_expires_at && new Date() > new Date(buyer.identity_verified_expires_at);
    if (!buyer?.identity_verified || idExpired) {
      res.status(403).json({ error: 'identity_verification_required' });
      return;
    }

    // Look up buyer's active membership for amount
    const [buyerMembership] = await db
      .select({ amount_cents: memberships.amount_cents })
      .from(memberships)
      .where(and(eq(memberships.user_id, buyerId), eq(memberships.status, 'active')))
      .limit(1);

    if (!buyerMembership) {
      res.status(400).json({ error: 'membership_required' });
      return;
    }

    const amount_cents = buyerMembership.amount_cents;
    const { cutCents } = calculateCut(amount_cents);

    const pi = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'cad',
      metadata: {
        type: 'portal_access',
        buyer_id: String(buyerId),
        owner_id: String(ownerId),
        source,
      },
    });

    res.json({ client_secret: pi.client_secret, amount_cents });
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/portal/identity-session — return pending Stripe Identity session for the user
router.get('/identity-session', requireVerifiedUser, async (req: Request, res: Response) => {
  const userId: number = (req as any).userId;
  try {
    const [user] = await db
      .select({
        identity_verified: users.identity_verified,
        identity_session_id: users.identity_session_id,
        identity_verified_expires_at: users.identity_verified_expires_at,
        id_attestation_expires_at: users.id_attestation_expires_at,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) { res.status(404).json({ error: 'not_found' }); return; }

    if (user.identity_verified) {
      // Check whether the 2-year verification period has lapsed
      const expired = user.identity_verified_expires_at && new Date() > new Date(user.identity_verified_expires_at);
      if (expired) {
        res.json({ already_verified: false, identity_expired: true, session: null });
        return;
      }
      res.json({ already_verified: true, session: null });
      return;
    }

    if (!user.identity_session_id) { res.json({ already_verified: false, session: null }); return; }

    // Check whether the operator's 24-hour attestation window has lapsed
    if (user.id_attestation_expires_at && new Date() > new Date(user.id_attestation_expires_at)) {
      await db.execute(sql`
        UPDATE users SET identity_session_id = NULL, id_attestation_expires_at = NULL WHERE id = ${userId}
      `).catch(() => {});
      await db.execute(sql`
        UPDATE id_attestation_log SET outcome = 'expired'
        WHERE user_id = ${userId} AND outcome = 'pending'
      `).catch(() => {});
      res.json({ already_verified: false, attestation_expired: true, session: null });
      return;
    }

    // Create a fresh ephemeral key for the existing session
    const ephemeralKey = await (stripe as any).ephemeralKeys.create(
      { verification_session: user.identity_session_id },
      { apiVersion: '2023-10-16' },
    );
    res.json({
      already_verified: false,
      session: {
        verificationSessionId: user.identity_session_id,
        ephemeralKeySecret: ephemeralKey.secret,
      },
    });
  } catch {
    // Session may have expired or been cancelled — clear it and respond
    await db.execute(sql`UPDATE users SET identity_session_id = NULL WHERE id = ${userId}`).catch(() => {});
    res.json({ already_verified: false, session: null });
  }
});

// POST /api/portal/start-identity-verification — operator-only: initiate Stripe Identity for a member
// Called from the shop terminal in-person; member completes document scan on their device
router.post('/start-identity-verification', requireVerifiedUser, async (req: Request, res: Response) => {
  const operatorId: number = (req as any).userId;

  try {
    const [operator] = await db
      .select({ is_shop: users.is_shop })
      .from(users)
      .where(eq(users.id, operatorId))
      .limit(1);

    if (!operator?.is_shop) {
      res.status(403).json({ error: 'shop_operators_only' });
      return;
    }

    const { user_code, confirmed } = req.body;
    if (!user_code || typeof user_code !== 'string') {
      res.status(400).json({ error: 'user_code is required' });
      return;
    }

    if (confirmed !== true) {
      res.status(400).json({ error: 'operator_attestation_required' });
      return;
    }

    const [targetUser] = await db
      .select({ id: users.id, verified: users.verified, identity_verified: users.identity_verified, push_token: users.push_token })
      .from(users)
      .where(eq(users.user_code, user_code.toUpperCase().trim()))
      .limit(1);

    if (!targetUser) { res.status(404).json({ error: 'user_not_found' }); return; }
    if (!targetUser.verified) { res.status(400).json({ error: 'user_must_be_nfc_verified_first' }); return; }
    if (targetUser.identity_verified) { res.json({ ok: true, already_verified: true }); return; }

    // Guard: operator cannot attest for themselves
    if (operatorId === targetUser.id) {
      res.status(403).json({ error: 'cannot_self_attest' });
      return;
    }

    // Rate limit: max 10 attestations per operator per hour
    const rateRows = await db.execute(sql`
      SELECT COUNT(*) AS count FROM id_attestation_log
      WHERE attested_by = ${operatorId} AND attested_at > now() - interval '1 hour'
    `);
    const attestCount = parseInt((rateRows as any)[0]?.count ?? '0', 10);
    if (attestCount >= 10) {
      res.status(429).json({ error: 'attestation_rate_limit_exceeded' });
      return;
    }

    // Mark any stale pending log entries as expired before creating a new one
    await db.execute(sql`
      UPDATE id_attestation_log SET outcome = 'expired'
      WHERE user_id = ${targetUser.id} AND outcome = 'pending'
    `);

    // Record operator attestation — the employee physically examined the ID
    // Attestation is valid for 24 hours; member must complete the Stripe scan in that window
    await db.execute(sql`
      UPDATE users
      SET id_attested_by = ${operatorId}, id_attested_at = now(),
          id_attestation_expires_at = now() + interval '24 hours'
      WHERE id = ${targetUser.id}
    `);

    const session = await (stripe as any).identity.verificationSessions.create({
      type: 'document',
      options: {
        document: {
          allowed_types: ['driving_license', 'passport'],
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      metadata: { user_id: String(targetUser.id) },
    });

    await db.execute(sql`UPDATE users SET identity_session_id = ${session.id} WHERE id = ${targetUser.id}`);

    // Append to immutable attestation log
    await db.execute(sql`
      INSERT INTO id_attestation_log (user_id, attested_by, stripe_session_id)
      VALUES (${targetUser.id}, ${operatorId}, ${session.id})
    `);

    if (targetUser.push_token) {
      sendPushNotification(targetUser.push_token, {
        title: 'ID verification ready',
        body: "Open your portal to scan your passport or driver's license.",
        data: { screen: 'portal' },
      }).catch(() => {});
    }

    res.json({ ok: true, user_id: targetUser.id });
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/portal/my-content — own content (no access check required)
router.get('/my-content', requireVerifiedUser, async (req: Request, res: Response) => {
  const userId: number = (req as any).userId;
  try {
    const content = await db
      .select()
      .from(portalContent)
      .where(eq(portalContent.user_id, userId))
      .orderBy(desc(portalContent.created_at));
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/portal/:userId/content
router.get('/:userId/content', requireVerifiedUser, async (req: Request, res: Response) => {
  const buyerId: number = (req as any).userId;
  const ownerId = parseInt(req.params.userId, 10);

  if (isNaN(ownerId)) {
    res.status(400).json({ error: 'invalid_user_id' });
    return;
  }

  try {
    // Require government ID verification to view content (also check it hasn't expired)
    const [buyer] = await db
      .select({ identity_verified: users.identity_verified, identity_verified_expires_at: users.identity_verified_expires_at })
      .from(users)
      .where(eq(users.id, buyerId))
      .limit(1);

    const buyerIdExpired = buyer?.identity_verified_expires_at && new Date() > new Date(buyer.identity_verified_expires_at);
    if (!buyer?.identity_verified || buyerIdExpired) {
      res.status(403).json({ error: 'identity_verification_required' });
      return;
    }

    const now = new Date();
    const [access] = await db
      .select({ id: portalAccess.id })
      .from(portalAccess)
      .where(
        and(
          eq(portalAccess.buyer_id, buyerId),
          eq(portalAccess.owner_id, ownerId),
          gt(portalAccess.expires_at, now),
        ),
      )
      .limit(1);

    if (!access) {
      res.status(403).json({ error: 'access_required' });
      return;
    }

    const content = await db
      .select()
      .from(portalContent)
      .where(eq(portalContent.user_id, ownerId))
      .orderBy(desc(portalContent.created_at));

    res.json(content);
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /api/portal/:userId/upload
router.post('/:userId/upload', requireVerifiedUser, async (req: Request, res: Response) => {
  const requestingUserId: number = (req as any).userId;
  const targetUserId = parseInt(req.params.userId, 10);

  if (isNaN(targetUserId)) {
    res.status(400).json({ error: 'invalid_user_id' });
    return;
  }

  if (requestingUserId !== targetUserId) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  const { media_url, type, caption } = req.body;

  if (!media_url || !type || !['photo', 'video'].includes(type)) {
    res.status(400).json({ error: 'media_url and valid type required' });
    return;
  }

  try {
    // Require government ID verification to post content (also check it hasn't expired)
    const [creator] = await db
      .select({ identity_verified: users.identity_verified, identity_verified_expires_at: users.identity_verified_expires_at })
      .from(users)
      .where(eq(users.id, requestingUserId))
      .limit(1);

    const creatorIdExpired = creator?.identity_verified_expires_at && new Date() > new Date(creator.identity_verified_expires_at);
    if (!creator?.identity_verified || creatorIdExpired) {
      res.status(403).json({ error: 'identity_verification_required' });
      return;
    }

    const [row] = await db
      .insert(portalContent)
      .values({
        user_id: requestingUserId,
        media_url,
        type,
        caption: caption ?? null,
      })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/portal/my-subscribers
router.get('/my-subscribers', requireVerifiedUser, async (req: Request, res: Response) => {
  const userId: number = (req as any).userId;

  try {
    const now = new Date();
    const rows = await db
      .select({
        id: portalAccess.id,
        buyer_id: portalAccess.buyer_id,
        buyer_display_name: users.display_name,
        amount_cents: portalAccess.amount_cents,
        platform_cut_cents: portalAccess.platform_cut_cents,
        source: portalAccess.source,
        expires_at: portalAccess.expires_at,
        created_at: portalAccess.created_at,
      })
      .from(portalAccess)
      .leftJoin(users, eq(portalAccess.buyer_id, users.id))
      .where(and(eq(portalAccess.owner_id, userId), gt(portalAccess.expires_at, now)))
      .orderBy(desc(portalAccess.created_at));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/portal/my-access
router.get('/my-access', requireVerifiedUser, async (req: Request, res: Response) => {
  const userId: number = (req as any).userId;

  try {
    const now = new Date();
    const rows = await db
      .select({
        id: portalAccess.id,
        owner_id: portalAccess.owner_id,
        owner_display_name: users.display_name,
        owner_portrait_url: users.portrait_url,
        amount_cents: portalAccess.amount_cents,
        source: portalAccess.source,
        expires_at: portalAccess.expires_at,
        created_at: portalAccess.created_at,
      })
      .from(portalAccess)
      .leftJoin(users, eq(portalAccess.owner_id, users.id))
      .where(and(eq(portalAccess.buyer_id, userId), gt(portalAccess.expires_at, now)))
      .orderBy(asc(portalAccess.expires_at));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
