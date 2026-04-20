import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5411585', longitude: '-113.5292499' })
    .where(eq(businesses.id, 45));
  console.log('Updated MIMI Bar: 53.5411585, -113.5292499');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
