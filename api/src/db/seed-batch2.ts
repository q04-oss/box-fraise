import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

const entries = [
  {
    biz: {
      name: 'Delavoye Chocolate Maker',
      type: 'partner',
      address: '10639 124 Street, Unit 105',
      city: 'Edmonton, AB',
      hours: 'Tue–Wed 11–6:30 · Thu–Fri 10–7 · Sat–Sun 9–7 · Mon Closed',
      contact: '780-784-9967',
      latitude: '53.5540',
      longitude: '-113.5297',
      launched_at: new Date('2026-01-01'),
      description: 'Artisan chocolate maker in Westmount, Edmonton.',
      neighbourhood: 'Westmount',
      approved_by_admin: true,
    },
    loc: { address: '10639 124 Street, Unit 105, Edmonton, AB T5N 1S5' },
  },
  {
    biz: {
      name: 'Duchess Bake Shop',
      type: 'partner',
      address: '10718 124 Street NW',
      city: 'Edmonton, AB',
      hours: 'Mon–Sat 9–6 · Sun 9–5',
      contact: '780-488-4999 · info@duchessbakeshop.com',
      latitude: '53.5547',
      longitude: '-113.5307',
      launched_at: new Date('2026-01-01'),
      description: 'French-inspired bakery and café on 124 Street.',
      neighbourhood: 'Westmount',
      approved_by_admin: true,
    },
    loc: { address: '10718 124 Street NW, Edmonton, AB' },
  },
  {
    biz: {
      name: 'Little Duchess',
      type: 'partner',
      address: '9570 76 Avenue NW',
      city: 'Edmonton, AB',
      hours: 'Mon–Sat 9:30–6 · Sun 9:30–5',
      contact: '587-525-8241',
      latitude: '53.5147',
      longitude: '-113.4862',
      launched_at: new Date('2026-01-01'),
      description: 'Duchess Bake Shop\'s second location in Ritchie Market.',
      neighbourhood: 'Ritchie',
      approved_by_admin: true,
    },
    loc: { address: '9570 76 Avenue NW, Edmonton, AB' },
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
