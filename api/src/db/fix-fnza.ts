import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5407547', longitude: '-113.5280926' })
    .where(eq(businesses.id, 57));
  console.log('Updated FNZA: 53.5407547, -113.5280926');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
