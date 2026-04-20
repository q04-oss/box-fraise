import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5424186', longitude: '-113.4909475' })
    .where(eq(businesses.id, 10));
  console.log('Updated Rosewood Foods: 53.5424186, -113.4909475');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
