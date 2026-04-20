import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'StopGap Coffee'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'StopGap Coffee',
    type: 'partner',
    address: '9749 111 Street NW',
    city: 'Edmonton, AB',
    hours: 'Tue–Wed & Fri 7:30–3 · Thu 7:30–2 · Sat 9–2 · Mon & Sun Closed',
    contact: 'stopgapyeg@gmail.com',
    latitude: '53.5497',
    longitude: '-113.5138',
    launched_at: new Date('2026-01-01'),
    description: 'Neighbourhood coffee shop in Oliver, Edmonton.',
    neighbourhood: 'Oliver',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'StopGap Coffee',
    address: '9749 111 Street NW, Edmonton, AB T5K 1J7',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
