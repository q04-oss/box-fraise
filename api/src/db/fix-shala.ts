import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.53966', longitude: '-113.49606' })
    .where(eq(businesses.id, 58));
  console.log('Updated The Shala: 53.53966, -113.49606');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
