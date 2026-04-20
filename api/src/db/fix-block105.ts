import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5483573', longitude: '-113.5108496' })
    .where(eq(businesses.id, 39));
  console.log('Updated Block 105: 53.5483573, -113.5108496');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
