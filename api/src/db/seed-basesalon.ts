import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Base Salon + Supply'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Base Salon + Supply',
    type: 'partner',
    address: '10108A 124 Street NW',
    city: 'Edmonton, AB',
    hours: 'Tue–Wed & Fri 10–6 · Thu 11–7 · Sat 10–5 · Sun 11–4 · Mon Closed · By appointment',
    latitude: '53.5529',
    longitude: '-113.5310',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Westmount',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Base Salon + Supply',
    address: '10108A 124 Street NW, Edmonton, AB T5N 1P6',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
