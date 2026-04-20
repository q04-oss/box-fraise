import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Kluane Mountaineering'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Kluane Mountaineering',
    type: 'partner',
    address: '10324 82 Avenue NW (Basement)',
    city: 'Edmonton, AB',
    hours: 'Tue–Sat · Hours vary',
    contact: '780-433-9986',
    latitude: '53.5188',
    longitude: '-113.4983',
    launched_at: new Date('2026-01-01'),
    description: 'Mountaineering and outdoor gear shop on Whyte Ave.',
    neighbourhood: 'Whyte Ave',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Kluane Mountaineering',
    address: '10324 82 Avenue NW, Edmonton, AB T6E 1Z8',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
