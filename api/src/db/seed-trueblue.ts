import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'True Blue'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'True Blue',
    type: 'partner',
    address: '10827 95 Street NW',
    city: 'Edmonton, AB',
    hours: 'Tue–Thu 10–7 · Fri 10–8 · Sat 9–4 · Mon & Sun Closed',
    contact: '587-590-7063',
    latitude: '53.5591',
    longitude: '-113.4710',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Alberta Avenue',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'True Blue',
    address: '10827 95 Street NW, Edmonton, AB T5H 2E2',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
