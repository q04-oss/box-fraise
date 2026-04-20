import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5424483', longitude: '-113.4916461' })
    .where(eq(businesses.id, 52));
  console.log('Updated Bianco: 53.5424483, -113.4916461');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
