import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Old Strathcona Farmers Market'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Old Strathcona Farmers Market',
    type: 'partner',
    address: '10310 83 Avenue NW',
    city: 'Edmonton, AB',
    hours: 'Sat 8–3 · Sun 11–3',
    contact: '780-439-1844',
    latitude: '53.5198',
    longitude: '-113.4981',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Whyte Ave',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Old Strathcona Farmers Market',
    address: '10310 83 Avenue NW, Edmonton, AB T6E 5C3',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
