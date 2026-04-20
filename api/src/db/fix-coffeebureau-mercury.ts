import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5432048', longitude: '-113.5348301' })
    .where(eq(businesses.id, 14));
  console.log('Updated Coffee Bureau — Mercury Block: 53.5432048, -113.5348301');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
