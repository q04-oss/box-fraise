import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Edmonton Unlimited'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Edmonton Unlimited',
    type: 'partner',
    address: '10107 Jasper Avenue',
    city: 'Edmonton, AB',
    hours: 'Mon–Fri 7:30–8 · Sat 9–4 · Sun Closed',
    contact: '825-965-7526',
    latitude: '53.5440',
    longitude: '-113.4921',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Downtown Edmonton',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Edmonton Unlimited',
    address: '10107 Jasper Avenue, Edmonton, AB T5J 1W8',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
