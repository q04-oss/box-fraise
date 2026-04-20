import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

const entries = [
  {
    biz: {
      name: 'White Rabbit Ice Cream — 110 Street',
      type: 'partner',
      address: '10546 110 Street NW',
      city: 'Edmonton, AB',
      hours: 'Daily 12–10',
      contact: '780-818-2180',
      latitude: '53.5487',
      longitude: '-113.5136',
      launched_at: new Date('2026-01-01'),
      neighbourhood: 'Oliver',
      approved_by_admin: true,
    },
    loc: { address: '10546 110 Street NW, Edmonton, AB' },
  },
  {
    biz: {
      name: 'White Rabbit Ice Cream — 99 Street',
      type: 'partner',
      address: '3747 99 Street NW',
      city: 'Edmonton, AB',
      hours: 'Tue–Thu 3–10 · Fri–Sat 12–11 · Sun 12–10 · Mon Closed',
      contact: '780-818-7886',
      latitude: '53.4820',
      longitude: '-113.4847',
      launched_at: new Date('2026-01-01'),
      neighbourhood: 'Millwoods',
      approved_by_admin: true,
    },
    loc: { address: '3747 99 Street NW, Edmonton, AB' },
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
