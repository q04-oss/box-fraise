import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Delavoye Chocolate Maker'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Delavoye Chocolate Maker',
    type: 'partner',
    address: '10639 124 Street, Unit 105',
    city: 'Edmonton, AB',
    hours: 'Tue–Wed 11–6:30 · Thu–Fri 10–7 · Sat–Sun 9–7 · Mon Closed',
    contact: '780-784-9967',
    latitude: '53.5540',
    longitude: '-113.5297',
    launched_at: new Date('2026-01-01'),
    description: 'Artisan chocolate maker in Westmount, Edmonton.',
    neighbourhood: 'Westmount',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Delavoye Chocolate Maker',
    address: '10639 124 Street, Unit 105, Edmonton, AB T5N 1S5',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
