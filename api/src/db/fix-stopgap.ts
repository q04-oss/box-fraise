import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5355097', longitude: '-113.5118035' })
    .where(eq(businesses.id, 17));
  console.log('Updated StopGap Coffee: 53.5355097, -113.5118035');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
