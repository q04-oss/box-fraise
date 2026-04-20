import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Nero'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Nero',
    type: 'partner',
    address: '12068 104 Avenue NW',
    city: 'Edmonton, AB',
    hours: 'Mon–Thu 11–10 · Fri–Sat 11–11 · Sun 4–10',
    contact: '780-249-1213',
    latitude: '53.5508',
    longitude: '-113.5176',
    launched_at: new Date('2026-01-01'),
    description: 'Restaurant in the historic Molson Brewery Building.',
    neighbourhood: 'Westmount',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Nero',
    address: '12068 104 Avenue NW, Edmonton, AB',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
