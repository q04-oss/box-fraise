import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function run() {
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS gifts_sender_user_id_idx ON gifts(sender_user_id);
    CREATE INDEX IF NOT EXISTS gifts_recipient_email_idx ON gifts(recipient_email);
  `);
  console.log('gift indexes created');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
