import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function run() {
  await db.execute(sql`
    ALTER TABLE gifts ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
  `);
  console.log('recipient_phone column added');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
