import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5441549', longitude: '-113.5361377' })
    .where(eq(businesses.id, 49));
  console.log('Updated Farrow — 124 Street: 53.5441549, -113.5361377');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
