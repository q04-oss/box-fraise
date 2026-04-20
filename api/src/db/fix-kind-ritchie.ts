import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses).set({ latitude: '53.512138', longitude: '-113.476085' }).where(eq(businesses.id, 28));
  console.log('Updated Kind Ice Cream — Ritchie: 53.512138, -113.476085');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
