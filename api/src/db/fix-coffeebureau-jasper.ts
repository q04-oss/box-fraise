import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.54079', longitude: '-113.5015' })
    .where(eq(businesses.id, 13));
  console.log('Updated Coffee Bureau — Jasper Ave: 53.54079, -113.5015');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
