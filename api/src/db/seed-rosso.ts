import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Rosso Pizzeria'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Rosso Pizzeria',
    type: 'partner',
    address: '8738 109 Street NW',
    city: 'Edmonton, AB',
    hours: 'Mon–Fri 11–10 · Sat 10–10 · Sun 10–9',
    contact: '780-433-5382',
    latitude: '53.5221',
    longitude: '-113.5083',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Garneau',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Rosso Pizzeria',
    address: '8738 109 Street NW, Edmonton, AB',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
