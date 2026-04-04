import { Router, Request, Response } from 'express';
import { eq, or, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { messages, users, nfcConnections, orders, varieties, timeSlots } from '../db/schema';
import { requireUser } from '../lib/auth';
import { sendPushNotification } from '../lib/push';
import { stripe } from '../lib/stripe';

const router = Router();

// Verify messaging permission:
// - Shop accounts can always be messaged (no NFC connection required)
// - Peer-to-peer requires verified status + NFC connection
async function canMessage(userA: number, userB: number): Promise<boolean> {
  const [sender, recipient] = await Promise.all([
    db.select({ verified: users.verified, is_shop: users.is_shop }).from(users).where(eq(users.id, userA)).then(r => r[0]),
    db.select({ verified: users.verified, is_shop: users.is_shop }).from(users).where(eq(users.id, userB)).then(r => r[0]),
  ]);
  if (!sender || !recipient) return false;

  // Either party is a shop account — always allowed
  if (sender.is_shop || recipient.is_shop) return true;

  // Peer-to-peer: both must be verified with an NFC connection
  if (!sender.verified || !recipient.verified) return false;
  const [connection] = await db
    .select({ id: nfcConnections.id })
    .from(nfcConnections)
    .where(
      or(
        and(eq(nfcConnections.user_a, userA), eq(nfcConnections.user_b, userB)),
        and(eq(nfcConnections.user_a, userB), eq(nfcConnections.user_b, userA)),
      )
    )
    .limit(1);
  return !!connection;
}

// GET /api/messages/conversations — list all conversations for current user
router.get('/conversations', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  try {
    // Get the latest message per conversation partner
    const rows = await db.execute<{
      other_user_id: number;
      display_name: string | null;
      user_code: string | null;
      is_shop: boolean;
      business_id: number | null;
      last_body: string;
      last_at: string;
      unread_count: number;
    }>(sql`
      SELECT
        other_user_id,
        u.display_name,
        u.user_code,
        u.is_shop,
        u.business_id,
        last_body,
        last_at,
        unread_count
      FROM (
        SELECT
          CASE WHEN sender_id = ${userId} THEN recipient_id ELSE sender_id END AS other_user_id,
          (array_agg(body ORDER BY created_at DESC))[1] AS last_body,
          MAX(created_at) AS last_at,
          COUNT(*) FILTER (WHERE recipient_id = ${userId} AND read = false) AS unread_count
        FROM messages
        WHERE sender_id = ${userId} OR recipient_id = ${userId}
        GROUP BY other_user_id
      ) t
      JOIN users u ON u.id = t.other_user_id
      ORDER BY last_at DESC
    `);
    const result = (rows as any).rows ?? rows;
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/:userId — thread with a specific user
router.get('/:userId', requireUser, async (req: Request, res: Response) => {
  const currentUserId = (req as any).userId as number;
  const otherId = parseInt(req.params.userId);
  if (isNaN(otherId)) { res.status(400).json({ error: 'Invalid user id' }); return; }

  try {
    const thread = await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.sender_id, currentUserId), eq(messages.recipient_id, otherId)),
          and(eq(messages.sender_id, otherId), eq(messages.recipient_id, currentUserId)),
        )
      )
      .orderBy(messages.created_at);

    // Mark received messages as read
    await db
      .update(messages)
      .set({ read: true })
      .where(and(eq(messages.recipient_id, currentUserId), eq(messages.sender_id, otherId)));

    res.json(thread);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages — send a message
router.post('/', requireUser, async (req: Request, res: Response) => {
  const senderId = (req as any).userId as number;
  const { recipient_id, body } = req.body;

  if (!recipient_id || !body?.trim()) {
    res.status(400).json({ error: 'recipient_id and body are required' });
    return;
  }

  try {
    const allowed = await canMessage(senderId, recipient_id);
    if (!allowed) {
      res.status(403).json({ error: 'You can only message verified contacts.' });
      return;
    }

    const [message] = await db
      .insert(messages)
      .values({ sender_id: senderId, recipient_id, body: body.trim() })
      .returning();

    // Push notification to recipient
    const [recipient] = await db
      .select({ push_token: users.push_token, display_name: users.display_name })
      .from(users)
      .where(eq(users.id, recipient_id));

    const [sender] = await db
      .select({ display_name: users.display_name, user_code: users.user_code })
      .from(users)
      .where(eq(users.id, senderId));

    if (recipient?.push_token) {
      const senderName = sender?.display_name ?? sender?.user_code ?? 'Someone';
      sendPushNotification(recipient.push_token, {
        title: senderName,
        body: body.trim(),
        data: { screen: 'messages', user_id: senderId },
      }).catch(() => {});
    }

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/offer — shop sends an offer card to a customer
router.post('/offer', requireUser, async (req: Request, res: Response) => {
  const senderId = (req as any).userId as number;
  const {
    recipient_id,
    variety_id,
    chocolate,
    finish,
    quantity,
    time_slot_id,
    location_id,
    note,
  } = req.body;

  if (!recipient_id || !variety_id || !chocolate || !finish || !quantity || !time_slot_id || !location_id) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const [sender] = await db.select({ is_shop: users.is_shop, display_name: users.display_name, user_code: users.user_code }).from(users).where(eq(users.id, senderId));
    if (!sender?.is_shop) {
      res.status(403).json({ error: 'Only shop accounts can send offers' });
      return;
    }

    const [variety] = await db.select({ name: varieties.name, price_cents: varieties.price_cents, stock_remaining: varieties.stock_remaining }).from(varieties).where(eq(varieties.id, variety_id));
    if (!variety) { res.status(404).json({ error: 'Variety not found' }); return; }

    const [slot] = await db.select({ time: timeSlots.time, date: timeSlots.date }).from(timeSlots).where(eq(timeSlots.id, time_slot_id));
    if (!slot) { res.status(404).json({ error: 'Time slot not found' }); return; }

    const total_cents = variety.price_cents * quantity;

    const metadata = {
      variety_id,
      variety_name: variety.name,
      price_cents: variety.price_cents,
      total_cents,
      chocolate,
      finish,
      quantity,
      time_slot_id,
      slot_time: slot.time,
      slot_date: String(slot.date),
      location_id,
      status: 'pending', // 'pending' | 'accepted' | 'paid' | 'expired'
    };

    const body = note?.trim() || `${variety.name} — CA$${(total_cents / 100).toFixed(2)}`;

    const [message] = await db
      .insert(messages)
      .values({ sender_id: senderId, recipient_id, body, type: 'offer', metadata })
      .returning();

    const [recipient] = await db.select({ push_token: users.push_token }).from(users).where(eq(users.id, recipient_id));
    if (recipient?.push_token) {
      const name = sender.display_name ?? sender.user_code ?? 'Shop';
      sendPushNotification(recipient.push_token, {
        title: name,
        body: `New offer: ${body}`,
        data: { screen: 'messages', user_id: senderId },
      }).catch(() => {});
    }

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/offer/:messageId/accept — customer accepts offer, get payment intent
router.post('/offer/:messageId/accept', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const messageId = parseInt(req.params.messageId, 10);
  if (isNaN(messageId)) { res.status(400).json({ error: 'Invalid message id' }); return; }

  const { customer_email, push_token } = req.body;
  if (!customer_email) { res.status(400).json({ error: 'customer_email required' }); return; }

  try {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message || message.type !== 'offer') { res.status(404).json({ error: 'Offer not found' }); return; }
    if (message.recipient_id !== userId) { res.status(403).json({ error: 'Not your offer' }); return; }

    const meta = message.metadata as any;
    if (meta.status !== 'pending') { res.status(400).json({ error: 'Offer already accepted or expired' }); return; }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: meta.total_cents,
      currency: 'cad',
      receipt_email: customer_email,
      metadata: {
        offer_message_id: String(messageId),
        variety_id: String(meta.variety_id),
        time_slot_id: String(meta.time_slot_id),
      },
    }, { idempotencyKey: `offer-${messageId}` });

    // Atomically mark as accepted only if still pending — prevents concurrent accepts
    const updatedRows = await db.update(messages).set({
      metadata: { ...meta, status: 'accepted', stripe_payment_intent_id: paymentIntent.id, customer_email, push_token: push_token ?? null },
    }).where(and(eq(messages.id, messageId), sql`(metadata->>'status') = 'pending'`)).returning({ id: messages.id });

    if (updatedRows.length === 0) {
      res.status(400).json({ error: 'Offer already accepted or expired' });
      return;
    }

    res.json({ client_secret: paymentIntent.client_secret, payment_intent_id: paymentIntent.id, total_cents: meta.total_cents });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/offer/:messageId/confirm — confirm payment, create order, send confirmation message
router.post('/offer/:messageId/confirm', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const messageId = parseInt(req.params.messageId, 10);
  if (isNaN(messageId)) { res.status(400).json({ error: 'Invalid message id' }); return; }

  try {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message || message.type !== 'offer') { res.status(404).json({ error: 'Offer not found' }); return; }
    if (message.recipient_id !== userId) { res.status(403).json({ error: 'Not your offer' }); return; }

    const meta = message.metadata as any;
    if (meta.status !== 'accepted') { res.status(400).json({ error: 'Offer not in accepted state' }); return; }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(meta.stripe_payment_intent_id);
    if (paymentIntent.status !== 'succeeded') {
      res.status(402).json({ error: 'Payment not confirmed' });
      return;
    }

    const nfc_token = randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();

    // Atomically: re-check status, decrement stock, create order, update offer, send confirmation
    const { orderId } = await db.transaction(async (tx) => {
      // Guard against concurrent confirms
      const [current] = await tx.select({ metadata: messages.metadata }).from(messages).where(eq(messages.id, messageId));
      const currentMeta = current?.metadata as any;
      if (currentMeta?.status !== 'accepted') throw Object.assign(new Error('already_confirmed'), { status: 402 });

      // Re-check and decrement stock atomically
      const stockResult = await tx
        .update(varieties)
        .set({ stock_remaining: sql`${varieties.stock_remaining} - ${meta.quantity}` })
        .where(and(eq(varieties.id, meta.variety_id), sql`${varieties.stock_remaining} >= ${meta.quantity}`))
        .returning({ stock_remaining: varieties.stock_remaining });
      if (stockResult.length === 0) throw Object.assign(new Error('sold_out'), { status: 409 });

      // Decrement slot booking
      await tx
        .update(timeSlots)
        .set({ booked: sql`${timeSlots.booked} + ${meta.quantity}` })
        .where(eq(timeSlots.id, meta.time_slot_id));

      const [order] = await tx.insert(orders).values({
        variety_id: meta.variety_id,
        location_id: meta.location_id,
        time_slot_id: meta.time_slot_id,
        chocolate: meta.chocolate,
        finish: meta.finish,
        quantity: meta.quantity,
        is_gift: false,
        total_cents: meta.total_cents,
        stripe_payment_intent_id: meta.stripe_payment_intent_id,
        status: 'paid',
        customer_email: meta.customer_email,
        push_token: meta.push_token ?? null,
        nfc_token,
      }).returning();

      await tx.update(messages).set({
        metadata: { ...meta, status: 'paid', order_id: order.id, nfc_token },
        order_id: order.id,
      }).where(eq(messages.id, messageId));

      await tx.insert(messages).values({
        sender_id: message.sender_id,
        recipient_id: userId,
        body: `order confirmed — pick up ${meta.slot_date} at ${meta.slot_time}`,
        type: 'order_confirm',
        metadata: { order_id: order.id, nfc_token, slot_date: meta.slot_date, slot_time: meta.slot_time, variety_name: meta.variety_name },
        order_id: order.id,
      });

      return { orderId: order.id };
    });

    res.json({ order_id: orderId, nfc_token });
  } catch (err: any) {
    if (err?.status) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
