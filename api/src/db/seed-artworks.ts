import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'The Artworks'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'The Artworks',
    type: 'partner',
    address: '10150 100 Street, Suite 100',
    city: 'Edmonton, AB',
    hours: 'Mon–Wed 10–6 · Thurs & Fri 10–7 · Sat 10–6 · Sun Closed',
    contact: '780-420-6311',
    latitude: '53.5432',
    longitude: '-113.4905',
    launched_at: new Date('2026-01-01'),
    description: 'Contemporary art gallery in downtown Edmonton.',
    neighbourhood: 'Downtown Edmonton',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'The Artworks',
    address: '10150 100 Street, Suite 100, Edmonton, AB',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
