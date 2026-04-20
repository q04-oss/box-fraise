import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5406267', longitude: '-113.5279824' })
    .where(eq(businesses.id, 56));
  console.log('Updated Kommune × Whisked: 53.5406267, -113.5279824');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
