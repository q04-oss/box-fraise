import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Marlo'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Marlo',
    type: 'partner',
    address: '10403 83 Avenue NW',
    city: 'Edmonton, AB',
    hours: 'Sun–Thu 11–10 · Fri–Sat 11–11',
    contact: '587-635-6082',
    latitude: '53.5197',
    longitude: '-113.4999',
    launched_at: new Date('2026-01-01'),
    description: 'Tacos and Mexican-inspired food on Whyte Ave.',
    neighbourhood: 'Whyte Ave',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Marlo',
    address: '10403 83 Avenue NW, Edmonton, AB T6E 2C7',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
