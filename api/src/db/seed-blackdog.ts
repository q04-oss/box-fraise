import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'The Blackdog Freehouse'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'The Blackdog Freehouse',
    type: 'partner',
    address: '10425 82 Avenue NW',
    city: 'Edmonton, AB',
    hours: 'Daily 2PM–2AM',
    contact: '780-439-1082',
    latitude: '53.5191',
    longitude: '-113.5004',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Whyte Ave',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'The Blackdog Freehouse',
    address: '10425 82 Avenue NW, Edmonton, AB T6E 2A1',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
