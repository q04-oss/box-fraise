import 'dotenv/config';
import app from './app';
import { seed } from './db/seed';
import { logger } from './lib/logger';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  try {
    await seed();
  } catch (err) {
    logger.warn('Seed skipped — continuing startup', err);
  }

  app.listen(PORT, () => {

  app.listen(PORT, () => {
    logger.info(`Maison Fraise API running on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
