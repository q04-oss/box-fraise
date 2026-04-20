import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Paper Birch Books'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Paper Birch Books',
    type: 'partner',
    address: '10825 95 Street NW',
    city: 'Edmonton, AB',
    hours: 'Mon–Fri 10–6 · Sat 10–5 · Sun 11–5',
    contact: '587-400-3207',
    latitude: '53.5591',
    longitude: '-113.4712',
    launched_at: new Date('2026-01-01'),
    description: 'Independent bookshop in Edmonton.',
    neighbourhood: 'Alberta Avenue',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Paper Birch Books',
    address: '10825 95 Street NW, Edmonton, AB',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
