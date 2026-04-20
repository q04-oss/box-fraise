import { and, eq, sql, lt } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { orders, batches, varieties, locations } from '../db/schema';
import { stripe } from './stripe';
import { sendBatchTriggered, sendOrderCancelled } from './resend';
import { sendPushNotification } from './push';
import { logger } from './logger';

export const MIN_QUANTITY = 4;
const LEAD_DAYS = 3;
const CUTOFF_DAYS = 7;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function checkAndTriggerBatch(
  variety_id: number,
  location_id: number,
): Promise<{ triggered: boolean; deliveryDate?: string }> {
  try {
    const cutoffTime = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000);

    // Cancel stale queued orders (older than 7 days) before acquiring the lock.
    // These are safe to cancel outside the trigger transaction — their PIs have
    // already expired and they will never count toward the threshold.
    const stale = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.variety_id, variety_id),
        eq(orders.location_id, location_id),
        eq(orders.status, 'queued'),
        lt(orders.queued_at, cutoffTime),
      ));

    for (const staleOrder of stale) {
      try {
        if (staleOrder.stripe_payment_intent_id && !staleOrder.stripe_payment_intent_id.startsWith('review_') && !staleOrder.stripe_payment_intent_id.startsWith('balance_')) {
          await stripe.paymentIntents.cancel(staleOrder.stripe_payment_intent_id);
        }
        await db.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, staleOrder.id));

        const [variety] = await db.select({ name: varieties.name }).from(varieties).where(eq(varieties.id, staleOrder.variety_id));
        sendOrderCancelled({
          to: staleOrder.customer_email,
          varietyName: variety?.name ?? 'your order',
          quantity: staleOrder.quantity,
        }).catch(() => {});

        if (staleOrder.push_token) {
          sendPushNotification(staleOrder.push_token, {
            title: 'Order cancelled',
            body: `Your queued order for ${variety?.name ?? 'strawberries'} wasn't filled. No charge was made.`,
          }).catch(() => {});
        }
      } catch (e) {
        logger.error(`Failed to cancel stale order ${staleOrder.id}: ${String(e)}`);
      }
    }

    // ── Atomic trigger: advisory lock prevents concurrent triggers for the same
    // (variety_id, location_id) pair. pg_advisory_xact_lock is held for the
    // duration of the transaction and released on commit/rollback.
    //
    // Inside the transaction we:
    //   1. Re-read the live queued pool (stale orders are already cancelled above)
    //   2. Check threshold
    //   3. Create the batch row
    //   4. Mark all queued orders as 'paid' — removing them from the pool so a
    //      subsequent concurrent trigger cannot double-count them.
    //
    // Stripe captures happen AFTER the transaction commits, so the lock is
    // already released by the time we hit the network. If a capture fails the
    // order remains marked 'paid' with payment_captured=false for manual review.
    // ───────────────────────────────────────────────────────────────────────────
    const lockKey = variety_id * 1_000_000 + location_id;
    const now = new Date();
    const deliveryDate = toISODate(addDays(now, LEAD_DAYS));

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

      const queued = await tx
        .select()
        .from(orders)
        .where(and(
          eq(orders.variety_id, variety_id),
          eq(orders.location_id, location_id),
          eq(orders.status, 'queued'),
        ));

      const totalQueued = queued.reduce((sum, o) => sum + o.quantity, 0);
      if (totalQueued < MIN_QUANTITY) return null;

      const [batch] = await tx.insert(batches).values({
        location_id,
        variety_id,
        quantity_total: totalQueued,
        quantity_remaining: 0,
        published: false,
        triggered_at: now,
        delivery_date: deliveryDate,
        lead_days: LEAD_DAYS,
        min_quantity: MIN_QUANTITY,
        cutoff_at: addDays(now, CUTOFF_DAYS),
      }).returning();

      // Mark all orders 'paid' inside the transaction to atomically remove them
      // from the queued pool. payment_captured stays false until Stripe confirms.
      for (const order of queued) {
        const nfc_token = randomUUID();
        await tx.update(orders).set({
          status: 'paid',
          batch_id: batch.id,
          nfc_token,
          payment_captured: false,
        }).where(eq(orders.id, order.id));
      }

      return { batch, queued };
    });

    if (!result) return { triggered: false };

    const { batch, queued } = result;

    const [variety] = await db.select({ name: varieties.name }).from(varieties).where(eq(varieties.id, variety_id));
    const [location] = await db.select({ name: locations.name }).from(locations).where(eq(locations.id, location_id));

    // Capture Stripe payment intents and update payment_captured flag.
    // Runs outside the transaction — failures are logged for manual reconciliation.
    for (const order of queued) {
      try {
        if (
          order.stripe_payment_intent_id &&
          !order.stripe_payment_intent_id.startsWith('review_') &&
          !order.stripe_payment_intent_id.startsWith('balance_')
        ) {
          await stripe.paymentIntents.capture(order.stripe_payment_intent_id);
        }
        await db.update(orders).set({ payment_captured: true }).where(eq(orders.id, order.id));

        sendBatchTriggered({
          to: order.customer_email,
          varietyName: variety?.name ?? 'strawberries',
          chocolate: order.chocolate,
          finish: order.finish,
          quantity: order.quantity,
          totalCents: order.total_cents,
          deliveryDate,
          locationName: location?.name ?? '',
        }).catch(() => {});

        if (order.push_token) {
          sendPushNotification(order.push_token, {
            title: 'Order confirmed',
            body: `Collect from ${location?.name ?? 'the shop'} from ${deliveryDate}.`,
            data: { screen: 'order-history' },
          }).catch(() => {});
        }
      } catch (e) {
        logger.error(`Failed to capture/update order ${order.id}: ${String(e)}`);
      }
    }

    logger.info(`Batch ${batch.id} triggered: ${queued.reduce((s, o) => s + o.quantity, 0)} boxes, delivery ${deliveryDate}`);
    return { triggered: true, deliveryDate };
  } catch (e) {
    logger.error(`checkAndTriggerBatch failed: ${String(e)}`);
    return { triggered: false };
  }
}

// @final-audit
