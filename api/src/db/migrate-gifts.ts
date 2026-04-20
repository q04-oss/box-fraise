import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS gifts (
      id SERIAL PRIMARY KEY,
      sender_user_id INTEGER NOT NULL REFERENCES users(id),
      recipient_email TEXT,
      gift_type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      claim_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_intent_id TEXT,
      shipping_name TEXT,
      shipping_address TEXT,
      shipping_city TEXT,
      shipping_province TEXT,
      shipping_postal_code TEXT,
      claimed_by_user_id INTEGER REFERENCES users(id),
      claimed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS gifts_sender_user_id_idx ON gifts(sender_user_id);
    CREATE INDEX IF NOT EXISTS gifts_recipient_email_idx ON gifts(recipient_email);
  `);
  console.log('gifts table + indexes created');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
