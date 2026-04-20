import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Bar Henry'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Bar Henry',
    type: 'partner',
    address: '160, 10220 103 Avenue NW',
    city: 'Edmonton, AB',
    hours: 'Wed–Thu 3–10 · Fri–Sat 3–11 · Sun–Tue Closed',
    contact: '587-873-4728',
    latitude: '53.5463',
    longitude: '-113.4937',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Downtown Edmonton',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Bar Henry',
    address: '160, 10220 103 Avenue NW, Edmonton, AB',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
