import crypto from 'crypto';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { logger } from './logger';

const PRIVATE_HOST = /^(localhost|127\.|0\.0\.0\.0|::1|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/i;

export function isSafeWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (PRIVATE_HOST.test(parsed.hostname)) return false;
    return true;
  } catch { return false; }
}

export async function fireWebhook(userId: number, event: string, payload: object): Promise<void> {
  try {
    const rows = await db.execute(sql`
      SELECT id, url, secret FROM webhook_subscriptions
      WHERE user_id = ${userId} AND active = true AND ${event} = ANY(events)
    `);
    const subs = (rows as any).rows ?? rows;
    for (const sub of subs) {
      if (!isSafeWebhookUrl(sub.url)) {
        logger.warn(`Skipping webhook delivery to unsafe URL for subscription ${sub.id}`);
        continue;
      }
      const body = JSON.stringify({ event, data: payload, fired_at: new Date().toISOString() });
      const sig = 'sha256=' + crypto.createHmac('sha256', sub.secret).update(body).digest('hex');
      fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fraise-Event': event,
          'X-Fraise-Signature': sig,
        },
        body,
      }).then(r => {
        db.execute(sql`
          UPDATE webhook_subscriptions SET last_fired_at=now(), last_status_code=${r.status}
          WHERE id=${sub.id}
        `).catch(() => {});
      }).catch((err) => {
        logger.error('Webhook delivery failed', { url: sub.url, err });
      });
    }
  } catch (err) {
    logger.error('fireWebhook error', err);
  }
}
