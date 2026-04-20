import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'GravityPope Footwear'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'GravityPope Footwear',
    type: 'partner',
    address: '#2, 10442 82 Avenue NW',
    city: 'Edmonton, AB',
    hours: 'Mon–Wed 11–6 · Thu–Sat 10–6 · Sun Closed',
    contact: '780-439-1637',
    latitude: '53.5191',
    longitude: '-113.5006',
    launched_at: new Date('2026-01-01'),
    description: 'GravityPope shoe store on Whyte Ave.',
    neighbourhood: 'Whyte Ave',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'GravityPope Footwear',
    address: '#2, 10442 82 Avenue NW, Edmonton, AB T6E 2A2',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
