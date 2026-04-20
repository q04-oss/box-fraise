import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5449702', longitude: '-113.4971751' })
    .where(eq(businesses.id, 44));
  console.log('Updated Bar Henry: 53.5449702, -113.4971751');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
