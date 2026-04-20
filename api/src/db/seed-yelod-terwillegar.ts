import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, "Yelo'd Ice Cream — Terwillegar"));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: "Yelo'd Ice Cream — Terwillegar",
    type: 'partner',
    address: '2327 Rabbit Hill Road NW',
    city: 'Edmonton, AB',
    hours: 'Sun–Thu 11–10 · Fri–Sat 11–11',
    latitude: '53.4441',
    longitude: '-113.5729',
    launched_at: new Date('2026-01-01'),
    description: 'Ice cream shop in Terwillegar.',
    neighbourhood: 'Terwillegar',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: "Yelo'd Ice Cream — Terwillegar",
    address: '2327 Rabbit Hill Road NW, Edmonton, AB T6R 3A8',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
