import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'MacEwan University'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'MacEwan University',
    type: 'partner',
    address: '10700 104 Avenue NW',
    city: 'Edmonton, AB',
    contact: 'info@macewan.ca',
    latitude: '53.5479',
    longitude: '-113.4970',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Downtown Edmonton',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'MacEwan University',
    address: '10700 104 Avenue NW, Edmonton, AB T5J 4S2',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
