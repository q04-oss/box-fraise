import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { ilike } from 'drizzle-orm';

async function run() {
  const result = await db.update(businesses)
    .set({ contact: 'sunterra@sunterramarket.com' })
    .where(ilike(businesses.name, 'Sunterra Market%'))
    .returning({ id: businesses.id, name: businesses.name, contact: businesses.contact });
  console.log('Updated:', result);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
