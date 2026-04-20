import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5411588', longitude: '-113.5291807' })
    .where(eq(businesses.id, 43));
  console.log('Updated Olia: 53.5411588, -113.5291807');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
