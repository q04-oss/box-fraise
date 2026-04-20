import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Labo Coffee'));
  if (existing.length > 0) { console.log('already exists, id:', existing[0].id); process.exit(0); }

  const [biz] = await db.insert(businesses).values({
    name: 'Labo Coffee',
    type: 'partner',
    address: '10546 82 Avenue NW',
    city: 'Edmonton, AB',
    hours: 'Mon–Fri 9–6 · Sat–Sun 9–5 · Holidays 9–4',
    latitude: '53.5194',
    longitude: '-113.5021',
    launched_at: new Date('2026-01-01'),
    neighbourhood: 'Whyte Ave',
    approved_by_admin: true,
  }).returning();

  await db.insert(locations).values({
    name: 'Labo Coffee',
    address: '10546 82 Avenue NW, Edmonton, AB T6E 2A4',
    active: true,
    business_id: biz.id,
  });

  console.log('Created:', biz.name, 'id:', biz.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
