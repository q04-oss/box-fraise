import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5418575', longitude: '-113.5361944' })
    .where(eq(businesses.id, 19));
  console.log('Updated Base Salon + Supply: 53.5418575, -113.5361944');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
