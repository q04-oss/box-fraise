import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5217597', longitude: '-113.517597' })
    .where(eq(businesses.id, 30));
  console.log('Updated Ace Coffee — Garneau: 53.5217597, -113.517597');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
