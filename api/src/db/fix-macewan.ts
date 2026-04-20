import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5467424', longitude: '-113.5063017' })
    .where(eq(businesses.id, 54));
  console.log('Updated MacEwan University: 53.5467424, -113.5063017');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
