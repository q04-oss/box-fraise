import 'dotenv/config';
import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'The Shala'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'The Shala',
    type: 'partner',
    address: '2nd Fl, 10026 102 Street NW',
    city: 'Edmonton, AB',
    contact: 'info@shalacentre.ca',
    latitude: '53.5424',
    longitude: '-113.4930',
    launched_at: new Date('2026-04-20'),
    neighbourhood: 'Downtown Edmonton',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'The Shala',
    address: '2nd Fl, 10026 102 Street NW, Edmonton, AB T5J 1C3',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
