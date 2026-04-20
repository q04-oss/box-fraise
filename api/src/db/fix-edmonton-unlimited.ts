import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5407456', longitude: '-113.4941766' })
    .where(eq(businesses.id, 34));
  console.log('Updated Edmonton Unlimited: 53.5407456, -113.4941766');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
