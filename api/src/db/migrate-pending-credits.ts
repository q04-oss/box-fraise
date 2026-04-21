import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pending_credit_transfers (
      id SERIAL PRIMARY KEY,
      from_user_id INTEGER NOT NULL REFERENCES users(id),
      recipient_email TEXT,
      recipient_phone TEXT,
      amount_cents INTEGER NOT NULL,
      claim_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_intent_id TEXT UNIQUE,
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log('pending_credit_transfers table ready');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
