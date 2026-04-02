import 'dotenv/config';
import cron from 'node-cron';
import { and, eq, lte } from 'drizzle-orm';
import app from './app';
import { db } from './db';
import { employmentContracts } from './db/schema';
import { seed } from './db/seed';
import { logger } from './lib/logger';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

// Run every day at 02:00 — mark expired active contracts as completed
cron.schedule('0 2 * * *', async () => {
  try {
    await db.update(employmentContracts)
      .set({ status: 'completed' })
      .where(and(eq(employmentContracts.status, 'active'), lte(employmentContracts.ends_at, new Date())));
    console.log('[cron] Expired contracts completed');
  } catch (e) { console.error('[cron] contract expire error', e); }
});

async function main(): Promise<void> {
  try {
    await seed();
  } catch (err) {
    logger.warn('Seed skipped — continuing startup', err);
  }

  app.listen(PORT, () => {
    logger.info(`Maison Fraise API running on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
