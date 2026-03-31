import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { stripe } from '../lib/stripe';
import { db } from '../db';
import { orders } from '../db/schema';
import { logger } from '../lib/logger';

const router = Router();

// POST /api/stripe/webhook
// Note: this route receives a raw Buffer body (configured in app.ts)
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    logger.warn('Stripe webhook signature verification failed', err);
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.stripe_payment_intent_id, pi.id));

      // Only mark paid if still pending — inventory is handled by /confirm endpoint
      if (order && order.status === 'pending') {
        await db.update(orders).set({ status: 'paid' }).where(eq(orders.id, order.id));
        logger.info(`Order ${order.id} marked paid via webhook`);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      await db
        .update(orders)
        .set({ status: 'cancelled' })
        .where(eq(orders.stripe_payment_intent_id, pi.id));
    }
  } catch (err) {
    // Log but return 200 — Stripe will retry on non-2xx responses
    logger.error('Webhook handler error', err);
  }

  res.json({ received: true });
});

export default router;
