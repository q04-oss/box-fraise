import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Block 105'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Block 105',
    type: 'partner',
    address: '11016 105 Avenue NW',
    city: 'Edmonton, AB',
    hours: 'Tue 9–6 · Wed–Fri 10–8 · Sat 10–6 · Mon & Sun Closed',
    contact: '780-498-1613',
    latitude: '53.5488',
    longitude: '-113.4974',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Westmount',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Block 105',
    address: '11016 105 Avenue NW, Edmonton, AB T5H 3Y1',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
