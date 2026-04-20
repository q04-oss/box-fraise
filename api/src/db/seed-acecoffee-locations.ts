import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

const entries = [
  {
    biz: {
      name: 'Ace Coffee — 97 Street',
      type: 'partner',
      address: '3696 97 Street NW',
      city: 'Edmonton, AB',
      hours: 'Fri & Sun 10–4 · Sat 9–4 · Mon–Thu Closed',
      latitude: '53.4802',
      longitude: '-113.4820',
      launched_at: new Date('2026-01-01'),
      neighbourhood: 'Millwoods',
      approved_by_admin: true,
    },
    loc: { address: '3696 97 Street NW, Edmonton, AB T6E 5S8' },
  },
  {
    biz: {
      name: 'Ace Coffee — 101 Street',
      type: 'partner',
      address: '230-10180 101 Street NW',
      city: 'Edmonton, AB',
      hours: 'Mon–Fri 7–4 · Sat–Sun Closed',
      latitude: '53.5428',
      longitude: '-113.4912',
      launched_at: new Date('2026-01-01'),
      neighbourhood: 'Downtown Edmonton',
      approved_by_admin: true,
    },
    loc: { address: '230-10180 101 Street NW, Edmonton, AB' },
  },
  {
    biz: {
      name: 'Ace Coffee — 80 Avenue',
      type: 'partner',
      address: '10055 80 Avenue NW',
      city: 'Edmonton, AB',
      hours: 'Daily 8–4',
      latitude: '53.5163',
      longitude: '-113.4946',
      launched_at: new Date('2026-01-01'),
      neighbourhood: 'Strathcona',
      approved_by_admin: true,
    },
    loc: { address: '10055 80 Avenue NW, Edmonton, AB T6E 1T4' },
  },
];

async function run() {
  for (const { biz, loc } of entries) {
    const existing = await db.select().from(businesses).where(eq(businesses.name, biz.name));
    if (existing.length > 0) { console.log('already exists:', biz.name, existing[0].id); continue; }
    const [b] = await db.insert(businesses).values(biz as any).returning();
    await db.insert(locations).values({ name: biz.name, address: loc.address, active: true, business_id: b.id });
    console.log('Created:', b.name, 'id:', b.id);
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
