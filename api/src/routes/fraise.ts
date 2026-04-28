import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { stripe } from '../lib/stripe';
import {
  sendFraiseWelcome,
  sendFraiseCreditsAdded,
  sendFraiseClaimConfirmation,
  sendFraiseEventConfirmed,
} from '../lib/resend';

const router = Router();

const CREDIT_PRICE_CENTS = 12000; // CA$120 per credit
const FRAISE_PLATFORM_FEE = 0.15;

// ── Helpers ──────────────────────────────────────────────────────────────────

function token(): string {
  return crypto.randomBytes(32).toString('hex');
}

function confirmToken(): string {
  return crypto.randomBytes(20).toString('hex');
}

// ── Auth middleware ───────────────────────────────────────────────────────────

async function requireMember(req: any, res: any, next: NextFunction) {
  const t = req.headers['x-member-token'] as string;
  if (!t) return res.status(401).json({ error: 'member token required' });
  const rows = await db.execute(sql`
    SELECT m.id, m.name, m.email, m.credit_balance
    FROM fraise_member_sessions s
    JOIN fraise_members m ON m.id = s.member_id
    WHERE s.token = ${t} AND s.expires_at > now()
    LIMIT 1
  `);
  const member = ((rows as any).rows ?? rows)[0] as any;
  if (!member) return res.status(401).json({ error: 'invalid or expired token' });
  req.member = member;
  next();
}

async function requireBusiness(req: any, res: any, next: NextFunction) {
  const t = req.headers['x-business-token'] as string;
  if (!t) return res.status(401).json({ error: 'business token required' });
  const rows = await db.execute(sql`
    SELECT b.id, b.slug, b.name, b.stripe_connect_account_id, b.stripe_connect_onboarded
    FROM fraise_business_sessions s
    JOIN business_accounts b ON b.id = s.business_id
    WHERE s.token = ${t} AND s.expires_at > now()
    LIMIT 1
  `);
  const business = ((rows as any).rows ?? rows)[0] as any;
  if (!business) return res.status(401).json({ error: 'invalid or expired token' });
  req.business = business;
  next();
}

function requireAdmin(req: any, res: any, next: NextFunction) {
  const pin = req.headers['x-admin-pin'];
  if (!pin || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'admin pin required' });
  }
  next();
}

// ── Member auth ───────────────────────────────────────────────────────────────

// POST /api/fraise/members/signup
router.post('/members/signup', async (req: any, res: any) => {
  const name  = String(req.body?.name ?? '').trim().slice(0, 200);
  const email = String(req.body?.email ?? '').trim().toLowerCase().slice(0, 200);
  const pw    = String(req.body?.password ?? '');
  if (!name || !email || pw.length < 8) {
    return res.status(400).json({ error: 'name, email, and password (8+ chars) required' });
  }
  try {
    const existing = await db.execute(sql`SELECT id FROM fraise_members WHERE email = ${email} LIMIT 1`);
    if (((existing as any).rows ?? existing).length) {
      return res.status(409).json({ error: 'email already registered' });
    }
    const hash = await bcrypt.hash(pw, 10);
    const rows = await db.execute(sql`
      INSERT INTO fraise_members (name, email, password_hash)
      VALUES (${name}, ${email}, ${hash})
      RETURNING id
    `);
    const memberId = (((rows as any).rows ?? rows)[0] as any).id;
    const t = token();
    await db.execute(sql`
      INSERT INTO fraise_member_sessions (member_id, token, expires_at)
      VALUES (${memberId}, ${t}, now() + interval '30 days')
    `);
    sendFraiseWelcome({ to: email, name }).catch(() => {});
    res.json({ token: t, name, email, credit_balance: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// POST /api/fraise/members/login
router.post('/members/login', async (req: any, res: any) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const pw    = String(req.body?.password ?? '');
  if (!email || !pw) return res.status(400).json({ error: 'email and password required' });
  try {
    const rows = await db.execute(sql`SELECT id, name, email, password_hash, credit_balance FROM fraise_members WHERE email = ${email} LIMIT 1`);
    const m = ((rows as any).rows ?? rows)[0] as any;
    if (!m || !(await bcrypt.compare(pw, m.password_hash))) {
      return res.status(401).json({ error: 'invalid email or password' });
    }
    const t = token();
    await db.execute(sql`
      INSERT INTO fraise_member_sessions (member_id, token, expires_at)
      VALUES (${m.id}, ${t}, now() + interval '30 days')
    `);
    res.json({ token: t, name: m.name, email: m.email, credit_balance: m.credit_balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// GET /api/fraise/members/me
router.get('/members/me', requireMember, async (req: any, res: any) => {
  const rows = await db.execute(sql`
    SELECT id, name, email, credit_balance, credits_purchased, created_at
    FROM fraise_members WHERE id = ${req.member.id} LIMIT 1
  `);
  res.json(((rows as any).rows ?? rows)[0]);
});

// GET /api/fraise/members/claims
router.get('/members/claims', requireMember, async (req: any, res: any) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        c.id, c.status, c.created_at,
        e.id AS event_id, e.title, e.description, e.price_cents,
        e.min_seats, e.max_seats, e.seats_claimed, e.status AS event_status, e.event_date,
        b.name AS business_name, b.slug AS business_slug
      FROM fraise_claims c
      JOIN fraise_events e ON e.id = c.event_id
      JOIN business_accounts b ON b.id = e.business_id
      WHERE c.member_id = ${req.member.id}
        AND c.status NOT IN ('declined')
      ORDER BY c.created_at DESC
    `);
    res.json({ claims: (rows as any).rows ?? rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// ── Credits ───────────────────────────────────────────────────────────────────

// POST /api/fraise/members/credits/checkout — create PI for N credits
router.post('/members/credits/checkout', requireMember, async (req: any, res: any) => {
  const credits = parseInt(req.body?.credits) || 0;
  if (credits < 1 || credits > 20) {
    return res.status(400).json({ error: 'credits must be between 1 and 20' });
  }
  const amountCents = credits * CREDIT_PRICE_CENTS;
  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: 'fraise_credits',
        member_id: String(req.member.id),
        credits: String(credits),
      },
    });
    res.json({ client_secret: intent.client_secret, amount_cents: amountCents, credits });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// POST /api/fraise/members/credits/confirm — verify PI, add credits
router.post('/members/credits/confirm', requireMember, async (req: any, res: any) => {
  const paymentIntentId = String(req.body?.payment_intent_id ?? '').trim();
  if (!paymentIntentId) return res.status(400).json({ error: 'payment_intent_id required' });
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      return res.status(402).json({ error: 'payment not confirmed' });
    }
    if (intent.metadata?.type !== 'fraise_credits' || String(intent.metadata?.member_id) !== String(req.member.id)) {
      return res.status(400).json({ error: 'payment intent does not match this account' });
    }
    // Idempotent: check if already processed
    const existing = await db.execute(sql`SELECT id FROM fraise_credit_purchases WHERE stripe_payment_intent_id = ${paymentIntentId} LIMIT 1`);
    if (((existing as any).rows ?? existing).length) {
      return res.status(409).json({ error: 'already processed' });
    }
    const credits = parseInt(intent.metadata.credits) || 0;
    if (credits < 1) return res.status(400).json({ error: 'invalid credits in payment metadata' });
    await db.execute(sql`
      INSERT INTO fraise_credit_purchases (member_id, credits, amount_cents, stripe_payment_intent_id)
      VALUES (${req.member.id}, ${credits}, ${intent.amount}, ${paymentIntentId})
    `);
    await db.execute(sql`
      UPDATE fraise_members
      SET credit_balance = credit_balance + ${credits},
          credits_purchased = credits_purchased + ${credits}
      WHERE id = ${req.member.id}
    `);
    const updated = await db.execute(sql`SELECT credit_balance FROM fraise_members WHERE id = ${req.member.id} LIMIT 1`);
    const balance = (((updated as any).rows ?? updated)[0] as any).credit_balance;
    sendFraiseCreditsAdded({ to: req.member.email, name: req.member.name, credits, balance }).catch(() => {});
    res.json({ ok: true, credits_added: credits, credit_balance: balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// ── Business auth ─────────────────────────────────────────────────────────────

// POST /api/fraise/businesses/signup
router.post('/businesses/signup', async (req: any, res: any) => {
  const name  = String(req.body?.name ?? '').trim().slice(0, 200);
  const slug  = String(req.body?.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
  const desc  = String(req.body?.description ?? '').trim().slice(0, 1000);
  const email = String(req.body?.email ?? '').trim().toLowerCase().slice(0, 200);
  const pw    = String(req.body?.password ?? '');
  if (!name || !slug || !email || pw.length < 8) {
    return res.status(400).json({ error: 'name, slug, email, and password (8+ chars) required' });
  }
  try {
    const conflict = await db.execute(sql`SELECT id FROM business_accounts WHERE slug = ${slug} OR email = ${email} LIMIT 1`);
    if (((conflict as any).rows ?? conflict).length) {
      return res.status(409).json({ error: 'slug or email already taken' });
    }
    const hash = await bcrypt.hash(pw, 10);
    const rows = await db.execute(sql`
      INSERT INTO business_accounts (slug, name, description, email, password_hash)
      VALUES (${slug}, ${name}, ${desc || null}, ${email}, ${hash})
      RETURNING id, slug, name
    `);
    const b = ((rows as any).rows ?? rows)[0] as any;
    const t = token();
    await db.execute(sql`
      INSERT INTO fraise_business_sessions (business_id, token, expires_at)
      VALUES (${b.id}, ${t}, now() + interval '30 days')
    `);
    res.json({ token: t, id: b.id, slug: b.slug, name: b.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// POST /api/fraise/businesses/login
router.post('/businesses/login', async (req: any, res: any) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const pw    = String(req.body?.password ?? '');
  if (!email || !pw) return res.status(400).json({ error: 'email and password required' });
  try {
    const rows = await db.execute(sql`SELECT id, slug, name, email, password_hash, stripe_connect_onboarded FROM business_accounts WHERE email = ${email} LIMIT 1`);
    const b = ((rows as any).rows ?? rows)[0] as any;
    if (!b || !(await bcrypt.compare(pw, b.password_hash))) {
      return res.status(401).json({ error: 'invalid email or password' });
    }
    const t = token();
    await db.execute(sql`
      INSERT INTO fraise_business_sessions (business_id, token, expires_at)
      VALUES (${b.id}, ${t}, now() + interval '30 days')
    `);
    res.json({ token: t, id: b.id, slug: b.slug, name: b.name, stripe_connect_onboarded: b.stripe_connect_onboarded });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// POST /api/fraise/businesses/apple-signin — Apple Sign In for business dashboard (web)
router.post('/businesses/apple-signin', async (req: any, res: any) => {
  const { identityToken } = req.body;
  if (!identityToken) return res.status(400).json({ error: 'identityToken required' });
  try {
    const appleSignin = (await import('apple-signin-auth')).default;
    const payload = await appleSignin.verifyIdToken(identityToken, {
      audience: [
        'com.boxfraise.app',
        process.env.APPLE_WEB_CLIENT_ID ?? 'com.boxfraise.web',
      ],
      ignoreExpiration: false,
    });
    const appleId = payload.sub;
    const appleEmail = payload.email;

    // Find existing account by apple_id or email
    let rows = await db.execute(sql`SELECT id, slug, name, stripe_connect_onboarded FROM business_accounts WHERE apple_id = ${appleId} LIMIT 1`);
    let b = ((rows as any).rows ?? rows)[0] as any;

    if (!b && appleEmail) {
      // Link Apple ID to existing email-based account
      await db.execute(sql`UPDATE business_accounts SET apple_id = ${appleId} WHERE email = ${appleEmail} AND apple_id IS NULL`);
      rows = await db.execute(sql`SELECT id, slug, name, stripe_connect_onboarded FROM business_accounts WHERE email = ${appleEmail} LIMIT 1`);
      b = ((rows as any).rows ?? rows)[0] as any;
    }

    if (!b) return res.status(404).json({ error: 'no business account found — contact support to get set up' });

    const t = token();
    await db.execute(sql`
      INSERT INTO fraise_business_sessions (business_id, token, expires_at)
      VALUES (${b.id}, ${t}, now() + interval '30 days')
    `);
    res.json({ token: t, id: b.id, slug: b.slug, name: b.name, stripe_connect_onboarded: b.stripe_connect_onboarded });
  } catch (err: any) {
    res.status(401).json({ error: err.message ?? 'apple sign in failed' });
  }
});

// GET /api/fraise/businesses/:slug/info — public, returns name for the sign-in page
router.get('/businesses/:slug/info', async (req: any, res: any) => {
  const rows = await db.execute(sql`SELECT name FROM business_accounts WHERE slug = ${req.params.slug} LIMIT 1`);
  const biz = ((rows as any).rows ?? rows)[0];
  if (!biz) return res.status(404).json({ error: 'not found' });
  res.json({ name: biz.name });
});

// PATCH /api/fraise/businesses/me — update name and/or slug
router.patch('/businesses/me', requireBusiness, async (req: any, res: any) => {
  const { name, slug } = req.body ?? {};
  if (!name && !slug) return res.status(400).json({ error: 'nothing to update' });
  const cleanSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9-]/g, '') : null;
  if (cleanSlug) {
    const conflict = await db.execute(sql`SELECT id FROM business_accounts WHERE slug = ${cleanSlug} AND id != ${req.business.id} LIMIT 1`);
    if (((conflict as any).rows ?? conflict).length > 0) return res.status(409).json({ error: 'slug already taken' });
  }
  await db.execute(sql`
    UPDATE business_accounts SET
      name = COALESCE(${name ?? null}, name),
      slug = COALESCE(${cleanSlug ?? null}, slug)
    WHERE id = ${req.business.id}
  `);
  res.json({ ok: true });
});

// GET /api/fraise/businesses/me
router.get('/businesses/me', requireBusiness, async (req: any, res: any) => {
  const rows = await db.execute(sql`
    SELECT id, slug, name, description, email, stripe_connect_onboarded, active, created_at
    FROM business_accounts WHERE id = ${req.business.id} LIMIT 1
  `);
  res.json(((rows as any).rows ?? rows)[0]);
});

// POST /api/fraise/businesses/connect
router.post('/businesses/connect', requireBusiness, async (req: any, res: any) => {
  const returnUrl = String(req.body?.return_url ?? '').trim();
  if (!returnUrl) return res.status(400).json({ error: 'return_url required' });
  try {
    let accountId = req.business.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express' });
      accountId = account.id;
      await db.execute(sql`UPDATE business_accounts SET stripe_connect_account_id = ${accountId} WHERE id = ${req.business.id}`);
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: returnUrl,
      return_url: returnUrl + '?connect=done',
      type: 'account_onboarding',
    });
    res.json({ url: link.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// POST /api/fraise/businesses/connect/verify
router.post('/businesses/connect/verify', requireBusiness, async (req: any, res: any) => {
  try {
    const rows = await db.execute(sql`SELECT stripe_connect_account_id FROM business_accounts WHERE id = ${req.business.id} LIMIT 1`);
    const b = ((rows as any).rows ?? rows)[0] as any;
    if (!b?.stripe_connect_account_id) return res.status(400).json({ error: 'no connect account' });
    const account = await stripe.accounts.retrieve(b.stripe_connect_account_id);
    if (account.details_submitted) {
      await db.execute(sql`UPDATE business_accounts SET stripe_connect_onboarded = true WHERE id = ${req.business.id}`);
    }
    res.json({ onboarded: account.details_submitted });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// ── Events ────────────────────────────────────────────────────────────────────

// ── Popups ────────────────────────────────────────────────────────────────────

// GET /api/fraise/popups — public feed
router.get('/popups', async (req: any, res: any) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        e.id, e.title, e.description, e.price_cents,
        e.min_seats, e.max_seats, e.seats_claimed, e.status,
        e.event_date, e.scheduled_at, e.created_at,
        b.slug AS business_slug, b.name AS business_name
      FROM fraise_events e
      JOIN business_accounts b ON b.id = e.business_id
      WHERE e.status IN ('open', 'threshold_met', 'scheduled', 'confirmed')
      ORDER BY e.created_at DESC
    `);
    res.json({ popups: (rows as any).rows ?? rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// GET /api/fraise/popups/my — business sees their own popups
router.get('/popups/my', requireBusiness, async (req: any, res: any) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, title, description, price_cents, min_seats, max_seats,
             seats_claimed, status, event_date, scheduled_at, created_at
      FROM fraise_events WHERE business_id = ${req.business.id}
      ORDER BY created_at DESC
    `);
    res.json({ popups: (rows as any).rows ?? rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// GET /api/fraise/popups/:id
router.get('/popups/:id', async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const rows = await db.execute(sql`
      SELECT
        e.id, e.title, e.description, e.price_cents,
        e.min_seats, e.max_seats, e.seats_claimed, e.status,
        e.event_date, e.scheduled_at, e.created_at,
        b.slug AS business_slug, b.name AS business_name
      FROM fraise_events e
      JOIN business_accounts b ON b.id = e.business_id
      WHERE e.id = ${id} LIMIT 1
    `);
    const popup = ((rows as any).rows ?? rows)[0];
    if (!popup) return res.status(404).json({ error: 'not found' });
    res.json(popup);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// POST /api/fraise/popups — business proposes a popup
router.post('/popups', requireBusiness, async (req: any, res: any) => {
  const title    = String(req.body?.title ?? '').trim().slice(0, 200);
  const desc     = String(req.body?.description ?? '').trim().slice(0, 2000);
  const minSeats = parseInt(req.body?.min_seats) || 6;
  const maxSeats = parseInt(req.body?.max_seats) || 30;
  const price    = parseInt(req.body?.price_cents);
  if (!title) return res.status(400).json({ error: 'title required' });
  if (!price || price < 100) return res.status(400).json({ error: 'price_cents required (minimum CA$1)' });
  if (minSeats < 1 || maxSeats < minSeats) return res.status(400).json({ error: 'invalid seat range' });
  try {
    const rows = await db.execute(sql`
      INSERT INTO fraise_events (business_id, title, description, price_cents, min_seats, max_seats)
      VALUES (${req.business.id}, ${title}, ${desc || null}, ${price}, ${minSeats}, ${maxSeats})
      RETURNING id, title, status, price_cents, min_seats, max_seats, created_at
    `);
    res.json(((rows as any).rows ?? rows)[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// POST /api/fraise/popups/:id/join — member pays to join, returns Stripe client_secret
router.post('/popups/:id/join', requireMember, async (req: any, res: any) => {
  const popupId = parseInt(req.params.id);
  if (isNaN(popupId)) return res.status(400).json({ error: 'invalid id' });
  try {
    const evRows = await db.execute(sql`
      SELECT id, status, max_seats, seats_claimed, price_cents, title, business_id
      FROM fraise_events WHERE id = ${popupId} LIMIT 1
    `);
    const popup = ((evRows as any).rows ?? evRows)[0] as any;
    if (!popup) return res.status(404).json({ error: 'popup not found' });
    if (!['open', 'threshold_met'].includes(popup.status)) return res.status(400).json({ error: 'popup is not open' });
    if (popup.seats_claimed >= popup.max_seats) return res.status(400).json({ error: 'popup is full' });

    // No duplicate joins
    const dup = await db.execute(sql`SELECT id FROM fraise_claims WHERE member_id = ${req.member.id} AND event_id = ${popupId} LIMIT 1`);
    if (((dup as any).rows ?? dup).length) return res.status(409).json({ error: 'already joined' });

    // Create Stripe PaymentIntent
    const intent = await stripe.paymentIntents.create({
      amount: popup.price_cents,
      currency: 'cad',
      metadata: { popup_id: String(popupId), member_id: String(req.member.id) },
      description: `${popup.title} — fraise popup`,
    });

    // Create pending claim
    await db.execute(sql`
      INSERT INTO fraise_claims (member_id, event_id, status, stripe_payment_intent_id, amount_paid_cents)
      VALUES (${req.member.id}, ${popupId}, 'pending', ${intent.id}, ${popup.price_cents})
    `);

    res.json({ client_secret: intent.client_secret, popup_id: popupId });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// POST /api/fraise/popups/:id/join/confirm — called after Stripe payment succeeds
router.post('/popups/:id/join/confirm', requireMember, async (req: any, res: any) => {
  const popupId = parseInt(req.params.id);
  if (isNaN(popupId)) return res.status(400).json({ error: 'invalid id' });
  try {
    const claimRows = await db.execute(sql`
      SELECT id, stripe_payment_intent_id FROM fraise_claims
      WHERE member_id = ${req.member.id} AND event_id = ${popupId} AND status = 'pending' LIMIT 1
    `);
    const claim = ((claimRows as any).rows ?? claimRows)[0] as any;
    if (!claim) return res.status(404).json({ error: 'no pending join found' });

    // Verify payment succeeded with Stripe
    const intent = await stripe.paymentIntents.retrieve(claim.stripe_payment_intent_id);
    if (intent.status !== 'succeeded') return res.status(402).json({ error: 'payment not completed' });

    await db.execute(sql`UPDATE fraise_claims SET status = 'claimed' WHERE id = ${claim.id}`);
    const newSeats = await db.execute(sql`
      UPDATE fraise_events SET seats_claimed = seats_claimed + 1 WHERE id = ${popupId}
      RETURNING seats_claimed, min_seats, status
    `);
    const updated = ((newSeats as any).rows ?? newSeats)[0] as any;

    if (updated.status === 'open' && updated.seats_claimed >= updated.min_seats) {
      await db.execute(sql`UPDATE fraise_events SET status = 'threshold_met' WHERE id = ${popupId}`);
    }

    const bizRows = await db.execute(sql`SELECT name FROM business_accounts WHERE id = (SELECT business_id FROM fraise_events WHERE id = ${popupId}) LIMIT 1`);
    const bizName = (((bizRows as any).rows ?? bizRows)[0] as any)?.name ?? '';
    const popup = await db.execute(sql`SELECT title FROM fraise_events WHERE id = ${popupId} LIMIT 1`);
    const title = (((popup as any).rows ?? popup)[0] as any)?.title ?? '';

    sendFraiseClaimConfirmation({ to: req.member.email, name: req.member.name, eventTitle: title, businessName: bizName, creditBalance: 0 }).catch(() => {});
    res.json({ ok: true, seats_claimed: updated.seats_claimed });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// POST /api/fraise/popups/:id/cancel — member cancels before date is set, full refund
router.post('/popups/:id/cancel', requireMember, async (req: any, res: any) => {
  const popupId = parseInt(req.params.id);
  if (isNaN(popupId)) return res.status(400).json({ error: 'invalid id' });
  try {
    const claimRows = await db.execute(sql`
      SELECT c.id, c.status, c.stripe_payment_intent_id, c.amount_paid_cents, e.status AS popup_status, e.scheduled_at
      FROM fraise_claims c
      JOIN fraise_events e ON e.id = c.event_id
      WHERE c.member_id = ${req.member.id} AND c.event_id = ${popupId} LIMIT 1
    `);
    const claim = ((claimRows as any).rows ?? claimRows)[0] as any;
    if (!claim) return res.status(404).json({ error: 'no claim found' });
    if (['declined', 'refunded'].includes(claim.status)) return res.status(400).json({ error: 'already cancelled' });

    // Issue Stripe refund
    let refundId: string | null = null;
    if (claim.stripe_payment_intent_id && claim.status === 'claimed') {
      const refund = await stripe.refunds.create({ payment_intent: claim.stripe_payment_intent_id });
      refundId = refund.id;
    }

    await db.execute(sql`
      UPDATE fraise_claims SET status = 'refunded', declined_at = now(), stripe_refund_id = ${refundId}
      WHERE id = ${claim.id}
    `);
    await db.execute(sql`UPDATE fraise_events SET seats_claimed = GREATEST(seats_claimed - 1, 0) WHERE id = ${popupId}`);
    await db.execute(sql`
      UPDATE fraise_events SET status = 'open'
      WHERE id = ${popupId} AND status = 'threshold_met' AND seats_claimed < min_seats
    `);

    res.json({ ok: true, refunded: !!refundId });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// POST /api/fraise/popups/:id/schedule — business sets date after threshold met, notifies all members
router.post('/popups/:id/schedule', requireBusiness, async (req: any, res: any) => {
  const popupId = parseInt(req.params.id);
  if (isNaN(popupId)) return res.status(400).json({ error: 'invalid id' });
  const eventDate = String(req.body?.event_date ?? '').trim().slice(0, 200);
  if (!eventDate) return res.status(400).json({ error: 'event_date required' });
  try {
    const evRows = await db.execute(sql`
      SELECT e.id, e.title, e.status, b.name AS business_name
      FROM fraise_events e JOIN business_accounts b ON b.id = e.business_id
      WHERE e.id = ${popupId} AND e.business_id = ${req.business.id} LIMIT 1
    `);
    const popup = ((evRows as any).rows ?? evRows)[0] as any;
    if (!popup) return res.status(404).json({ error: 'popup not found' });
    if (!['threshold_met', 'open'].includes(popup.status)) return res.status(400).json({ error: 'popup cannot be scheduled in its current state' });

    await db.execute(sql`
      UPDATE fraise_events SET status = 'confirmed', event_date = ${eventDate}, scheduled_at = now()
      WHERE id = ${popupId}
    `);

    // Notify all active claimants
    const claimRows = await db.execute(sql`
      UPDATE fraise_claims SET confirm_token = encode(gen_random_bytes(20), 'hex')
      WHERE event_id = ${popupId} AND status = 'claimed'
      RETURNING id, confirm_token, member_id
    `);
    const claims = (claimRows as any).rows ?? claimRows;

    const apiBase = process.env.API_BASE_URL ?? 'https://api.fraise.box';
    for (const c of claims) {
      const memRows = await db.execute(sql`SELECT name, email FROM fraise_members WHERE id = ${c.member_id} LIMIT 1`);
      const mem = ((memRows as any).rows ?? memRows)[0] as any;
      if (!mem) continue;
      const confirmUrl = `${apiBase}/api/fraise/claims/confirm/${c.confirm_token}`;
      const declineUrl = `${apiBase}/api/fraise/claims/decline/${c.confirm_token}`;
      sendFraiseEventConfirmed({ to: mem.email, name: mem.name, eventTitle: popup.title, businessName: popup.business_name, eventDate, confirmUrl, declineUrl }).catch(() => {});
    }

    res.json({ ok: true, notified: claims.length, event_date: eventDate });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// GET /api/fraise/popups/:id/members — business sees who joined
router.get('/popups/:id/members', requireBusiness, async (req: any, res: any) => {
  const popupId = parseInt(req.params.id);
  if (isNaN(popupId)) return res.status(400).json({ error: 'invalid id' });
  try {
    const evRows = await db.execute(sql`SELECT id FROM fraise_events WHERE id = ${popupId} AND business_id = ${req.business.id} LIMIT 1`);
    if (!((evRows as any).rows ?? evRows).length) return res.status(404).json({ error: 'popup not found' });
    const rows = await db.execute(sql`
      SELECT c.id, c.status, c.created_at, c.amount_paid_cents, m.name, m.email
      FROM fraise_claims c JOIN fraise_members m ON m.id = c.member_id
      WHERE c.event_id = ${popupId} ORDER BY c.created_at ASC
    `);
    res.json({ members: (rows as any).rows ?? rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// POST /api/fraise/events/:id/confirm — kept for backwards compat, proxies to schedule
router.post('/events/:id/confirm', async (req: any, res: any) => {
  const eventId = parseInt(req.params.id);
  if (isNaN(eventId)) return res.status(400).json({ error: 'invalid id' });

  const pin = req.headers['x-admin-pin'];
  const bizToken = req.headers['x-business-token'] as string;
  let businessId: number | null = null;

  if (pin && pin === process.env.ADMIN_PIN) {
    businessId = null;
  } else if (bizToken) {
    const r = await db.execute(sql`SELECT business_id FROM fraise_business_sessions WHERE token = ${bizToken} AND expires_at > now() LIMIT 1`);
    const row = ((r as any).rows ?? r)[0] as any;
    if (!row) return res.status(401).json({ error: 'unauthorized' });
    businessId = row.business_id;
  } else {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const eventDate = String(req.body?.event_date ?? '').trim().slice(0, 100);
  if (!eventDate) return res.status(400).json({ error: 'event_date required' });

  try {
    const evQuery = businessId
      ? sql`SELECT e.id, e.title, e.status, b.name AS business_name FROM fraise_events e JOIN business_accounts b ON b.id = e.business_id WHERE e.id = ${eventId} AND e.business_id = ${businessId} LIMIT 1`
      : sql`SELECT e.id, e.title, e.status, b.name AS business_name FROM fraise_events e JOIN business_accounts b ON b.id = e.business_id WHERE e.id = ${eventId} LIMIT 1`;

    const evRows = await db.execute(evQuery);
    const event = ((evRows as any).rows ?? evRows)[0] as any;
    if (!event) return res.status(404).json({ error: 'event not found' });
    if (event.status === 'confirmed') return res.status(400).json({ error: 'already confirmed' });

    await db.execute(sql`UPDATE fraise_events SET status = 'confirmed', event_date = ${eventDate}, scheduled_at = now() WHERE id = ${eventId}`);

    const claimRows = await db.execute(sql`
      UPDATE fraise_claims SET confirm_token = encode(gen_random_bytes(20), 'hex')
      WHERE event_id = ${eventId} AND status = 'claimed'
      RETURNING id, confirm_token, member_id
    `);
    const claims = (claimRows as any).rows ?? claimRows;

    const apiBase = process.env.API_BASE_URL ?? 'https://api.fraise.box';
    for (const c of claims) {
      const memRows = await db.execute(sql`SELECT name, email FROM fraise_members WHERE id = ${c.member_id} LIMIT 1`);
      const mem = ((memRows as any).rows ?? memRows)[0] as any;
      if (!mem) continue;
      const confirmUrl = `${apiBase}/api/fraise/claims/confirm/${c.confirm_token}`;
      const declineUrl = `${apiBase}/api/fraise/claims/decline/${c.confirm_token}`;
      sendFraiseEventConfirmed({ to: mem.email, name: mem.name, eventTitle: event.title, businessName: event.business_name, eventDate, confirmUrl, declineUrl }).catch(() => {});
    }

    res.json({ ok: true, notified: claims.length, event_date: eventDate });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'internal' });
  }
});

// ── Claim token actions (from email links) ────────────────────────────────────

function claimResponsePage(heading: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${heading} — fraise.box</title><style>*{box-sizing:border-box;margin:0;padding:0}html{background:#fff;font-family:'DM Mono',monospace;font-size:14px;-webkit-font-smoothing:antialiased}body{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:2rem}main{max-width:400px;width:100%}.eyebrow{font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:#8A8880;margin-bottom:0.5rem}h1{font-size:1rem;font-weight:500;margin-bottom:1rem}p{font-size:0.78rem;color:#8A8880;line-height:1.7}a{color:#1A1A18;text-underline-offset:3px}</style></head><body><main><div class="eyebrow">fraise.box</div><h1>${heading}</h1><p>${body}</p></main></body></html>`;
}

// GET /api/fraise/claims/confirm/:token
router.get('/claims/confirm/:token', async (req: any, res: any) => {
  const t = String(req.params.token ?? '').trim();
  if (!t) return res.status(400).send(claimResponsePage('invalid link', 'this confirmation link is not valid.'));
  try {
    const rows = await db.execute(sql`
      SELECT c.id, c.status, m.name
      FROM fraise_claims c
      JOIN fraise_members m ON m.id = c.member_id
      WHERE c.confirm_token = ${t} LIMIT 1
    `);
    const claim = ((rows as any).rows ?? rows)[0] as any;
    if (!claim) return res.send(claimResponsePage('link not found', 'this link has already been used or does not exist.'));
    if (claim.status === 'confirmed') return res.send(claimResponsePage("already confirmed.", `you're already confirmed. see you there.`));
    if (claim.status === 'declined') return res.send(claimResponsePage('already declined', 'you already released this spot. your credit was returned.'));
    await db.execute(sql`
      UPDATE fraise_claims SET status = 'confirmed', confirmed_at = now(), confirm_token = NULL WHERE id = ${claim.id}
    `);
    res.send(claimResponsePage("you're confirmed.", `see you there, ${claim.name.split(' ')[0]}. we'll be in touch with any details closer to the date.`));
  } catch (err: any) {
    res.status(500).send(claimResponsePage('error', 'something went wrong. reply to your email and we\'ll sort it.'));
  }
});

// GET /api/fraise/claims/decline/:token — releases spot, returns credit
router.get('/claims/decline/:token', async (req: any, res: any) => {
  const t = String(req.params.token ?? '').trim();
  if (!t) return res.status(400).send(claimResponsePage('invalid link', 'this decline link is not valid.'));
  try {
    const rows = await db.execute(sql`
      SELECT c.id, c.status, c.event_id, c.member_id, m.name
      FROM fraise_claims c
      JOIN fraise_members m ON m.id = c.member_id
      WHERE c.confirm_token = ${t} LIMIT 1
    `);
    const claim = ((rows as any).rows ?? rows)[0] as any;
    if (!claim) return res.send(claimResponsePage('link not found', 'this link has already been used or does not exist.'));
    if (claim.status === 'declined') return res.send(claimResponsePage('already released', 'your credit was already returned. use it on the next event.'));
    if (claim.status === 'confirmed') return res.send(claimResponsePage('already confirmed', 'you already confirmed this spot. reply to your email if you need to cancel.'));

    await db.execute(sql`UPDATE fraise_claims SET status = 'declined', declined_at = now(), confirm_token = NULL WHERE id = ${claim.id}`);
    await db.execute(sql`UPDATE fraise_members SET credit_balance = credit_balance + 1 WHERE id = ${claim.member_id}`);
    await db.execute(sql`UPDATE fraise_events SET seats_claimed = GREATEST(seats_claimed - 1, 0) WHERE id = ${claim.event_id}`);

    res.send(claimResponsePage('spot released.', `no problem, ${claim.name.split(' ')[0]}. your credit has been returned — it'll be there for the next event.`));
  } catch (err: any) {
    res.status(500).send(claimResponsePage('error', 'something went wrong. reply to your email and we\'ll sort it.'));
  }
});

// ── Admin ─────────────────────────────────────────────────────────────────────

router.get('/admin/members', requireAdmin, async (req: any, res: any) => {
  const rows = await db.execute(sql`
    SELECT id, name, email, credit_balance, credits_purchased, created_at
    FROM fraise_members ORDER BY created_at DESC
  `);
  res.json({ members: (rows as any).rows ?? rows });
});

router.get('/admin/businesses', requireAdmin, async (req: any, res: any) => {
  const rows = await db.execute(sql`
    SELECT id, slug, name, email, stripe_connect_onboarded, active, created_at
    FROM business_accounts ORDER BY created_at DESC
  `);
  res.json({ businesses: (rows as any).rows ?? rows });
});

router.get('/admin/events', requireAdmin, async (req: any, res: any) => {
  const rows = await db.execute(sql`
    SELECT e.id, e.title, e.status, e.price_cents, e.min_seats, e.max_seats,
           e.seats_claimed, e.event_date, e.created_at, b.name AS business_name
    FROM fraise_events e
    JOIN business_accounts b ON b.id = e.business_id
    ORDER BY e.created_at DESC
  `);
  res.json({ events: (rows as any).rows ?? rows });
});

export default router;
