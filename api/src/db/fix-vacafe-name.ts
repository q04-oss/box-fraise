import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ name: 'Va', contact: 'info@va-yeg.ca' })
    .where(eq(businesses.id, 42));
  console.log('Updated: name → Va, contact → info@va-yeg.ca');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
