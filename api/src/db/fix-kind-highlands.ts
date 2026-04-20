import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5646719', longitude: '-113.4380117' })
    .where(eq(businesses.id, 29));
  console.log('Updated Kind Ice Cream — Highlands: 53.5646719, -113.4380117');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
