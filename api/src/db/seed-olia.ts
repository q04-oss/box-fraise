import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Olia'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Olia',
    type: 'partner',
    address: '12016 Jasper Avenue',
    city: 'Edmonton, AB',
    hours: 'Daily from 5PM',
    contact: '780-244-5156',
    latitude: '53.5449',
    longitude: '-113.5213',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Oliver',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Olia',
    address: '12016 Jasper Avenue, Edmonton, AB',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
