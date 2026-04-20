import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Shade Strip Club'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Shade Strip Club',
    type: 'partner',
    address: '10148 105 Street NW',
    city: 'Edmonton, AB',
    hours: 'Mon–Sat 7PM–3AM · Sun Closed',
    contact: '780-761-2742',
    latitude: '53.5449',
    longitude: '-113.4966',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Downtown Edmonton',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Shade Strip Club',
    address: '10148 105 Street NW, Edmonton, AB T5J 1C9',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
