import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'FNZA'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'FNZA',
    type: 'partner',
    address: '11939 Jasper Avenue NW',
    city: 'Edmonton, AB',
    hours: 'Tue–Sun 11–11 · Mon Closed',
    contact: '587-900-9666',
    latitude: '53.5449',
    longitude: '-113.5197',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Wîhkwêntôwin (Oliver)',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'FNZA',
    address: '11939 Jasper Avenue NW, Edmonton, AB',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
