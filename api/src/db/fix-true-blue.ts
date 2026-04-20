import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses).set({ latitude: '53.5553896', longitude: '-113.4839263' }).where(eq(businesses.id, 16));
  console.log('Updated True Blue: 53.5553896, -113.4839263');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
