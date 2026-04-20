import { db } from './index';
import { businesses } from './schema';
import { inArray } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ hours: 'Oct–Apr 11–9 daily · May–Sep 11–10 daily' })
    .where(inArray(businesses.id, [27, 28, 29]));
  console.log('updated hours for Kind Ice Cream locations 27, 28, 29');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
