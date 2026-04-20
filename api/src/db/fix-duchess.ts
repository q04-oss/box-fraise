import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5515464', longitude: '-113.5361601' })
    .where(eq(businesses.id, 21));
  console.log('Updated Duchess Bake Shop: 53.5515464, -113.5361601');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
