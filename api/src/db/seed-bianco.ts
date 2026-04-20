import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Bianco'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Bianco',
    type: 'partner',
    address: '#120, 10020 101A Avenue NW',
    city: 'Edmonton, AB',
    hours: 'Mon–Thu 11–10 · Fri–Sat 11–11 · Sun 4–10',
    contact: '780-761-8838',
    latitude: '53.5453',
    longitude: '-113.4924',
    launched_at: new Date('2026-01-01'),
    description: 'Italian restaurant on Rice Howard Way in downtown Edmonton.',
    neighbourhood: 'Downtown Edmonton',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Bianco',
    address: '#120, 10020 101A Avenue NW, Edmonton, AB',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
