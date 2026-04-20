import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5427198', longitude: '-113.4939961' })
    .where(eq(businesses.id, 32));
  console.log('Updated Ace Coffee — 101 Street: 53.5427198, -113.4939961');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
