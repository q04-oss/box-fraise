import 'dotenv/config';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function seed() {
  const existing = await sql`SELECT id FROM business_accounts WHERE slug = 'kommunexwhisked' LIMIT 1`;
  if (existing.length > 0) {
    console.log('Kommune X Whisked already seeded, skipping.');
    process.exit(0);
  }

  // Temporary password — they should change this on first login
  const tempPassword = 'kommuneXwhisked2026!';
  const hash = await bcrypt.hash(tempPassword, 10);

  await sql`
    INSERT INTO business_accounts (slug, name, email, password_hash, active)
    VALUES ('kommunexwhisked', 'Kommune X Whisked', 'hello@kommunexwhisked.com', ${hash}, true)
  `;

  console.log('Kommune X Whisked seeded.');
  console.log('  URL:      fraise.box/business/kommunexwhisked');
  console.log('  Email:    hello@kommunexwhisked.com');
  console.log('  Password: ' + tempPassword);
  console.log('  → Send these credentials to the owner and ask them to change the password.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
