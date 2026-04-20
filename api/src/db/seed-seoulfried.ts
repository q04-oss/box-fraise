import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Seoul Fried Chicken'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Seoul Fried Chicken',
    type: 'partner',
    address: '#101, 10145 104 Street NW',
    city: 'Edmonton, AB',
    hours: 'Mon–Sat 11:30–close · Sun 11:30–8PM',
    contact: '780-249-2096',
    latitude: '53.5441',
    longitude: '-113.4943',
    launched_at: new Date('2026-01-01'),
    description: 'Korean fried chicken on 104 Street in downtown Edmonton.',
    neighbourhood: '104 Street – Downtown Edmonton',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Seoul Fried Chicken',
    address: '#101, 10145 104 Street NW, Edmonton, AB',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
