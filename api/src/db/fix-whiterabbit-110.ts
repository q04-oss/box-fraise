import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.548959', longitude: '-113.5108009' })
    .where(eq(businesses.id, 40));
  console.log('Updated White Rabbit Ice Cream — 110 Street: 53.548959, -113.5108009');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
