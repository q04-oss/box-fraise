import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'The Observatory'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'The Observatory',
    type: 'partner',
    address: '10608 82 Avenue NW',
    city: 'Edmonton, AB',
    hours: 'Mon–Wed 10–6 · Thu 11–8 · Fri–Sat 11–6 · Sun & Holidays Closed',
    contact: '780-438-3448',
    latitude: '53.5194',
    longitude: '-113.5028',
    launched_at: new Date('2026-01-01'),
    description: 'Eyewear boutique on Whyte Ave.',
    neighbourhood: 'Whyte Ave',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'The Observatory',
    address: '10608 82 Avenue NW, Edmonton, AB T6E 2A7',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
