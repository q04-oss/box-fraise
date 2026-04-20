import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5411575', longitude: '-113.5295999' })
    .where(eq(businesses.id, 42));
  console.log('Updated Va Cafe: 53.5411575, -113.5295999');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
