import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5504396', longitude: '-113.5355475' })
    .where(eq(businesses.id, 20));
  console.log('Updated Delavoye Chocolate Maker: 53.5504396, -113.5355475');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
