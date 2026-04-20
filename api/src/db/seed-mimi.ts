import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'MIMI Bar'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'MIMI Bar',
    type: 'partner',
    address: '12018 Jasper Avenue',
    city: 'Edmonton, AB',
    hours: 'Wed–Thu & Sun 6PM–12AM · Fri–Sat 6PM–late · Mon–Tue Closed',
    contact: '780-244-4476',
    latitude: '53.5449',
    longitude: '-113.5214',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Oliver',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'MIMI Bar',
    address: '12018 Jasper Avenue, Edmonton, AB',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
