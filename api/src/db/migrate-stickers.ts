import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function run() {
  await db.execute(sql`
    ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS sticker_concept TEXT,
      ADD COLUMN IF NOT EXISTS sticker_emoji TEXT;

    ALTER TABLE gifts
      ADD COLUMN IF NOT EXISTS sticker_business_id INTEGER REFERENCES businesses(id),
      ADD COLUMN IF NOT EXISTS business_revenue_cents INTEGER;

    CREATE INDEX IF NOT EXISTS gifts_sticker_business_id_idx ON gifts(sticker_business_id);
  `);
  console.log('sticker columns added');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
