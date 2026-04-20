import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

const entries = [
  {
    biz: {
      name: 'Farrow — Garneau',
      type: 'partner',
      address: '8422 109 Street NW',
      city: 'Edmonton, AB',
      hours: 'Daily 9–7',
      contact: '780-757-4160',
      latitude: '53.5228',
      longitude: '-113.5083',
      launched_at: new Date('2026-01-01'),
      neighbourhood: 'Garneau',
      approved_by_admin: true,
    },
    loc: { address: '8422 109 Street NW, Edmonton, AB T6G 1E2' },
  },
  {
    biz: {
      name: 'Farrow — Ritchie',
      type: 'partner',
      address: '9855 76 Avenue NW',
      city: 'Edmonton, AB',
      hours: 'Daily 8–5',
      contact: '780-757-0132',
      latitude: '53.5150',
      longitude: '-113.4929',
      launched_at: new Date('2026-01-01'),
      neighbourhood: 'Ritchie',
      approved_by_admin: true,
    },
    loc: { address: '9855 76 Avenue NW, Edmonton, AB T6E 1K6' },
  },
  {
    biz: {
      name: 'Farrow — 124 Street',
      type: 'partner',
      address: '#6, 10240 124 Street NW',
      city: 'Edmonton, AB',
      hours: 'Daily 9–7',
      contact: '780-249-0085',
      latitude: '53.5468',
      longitude: '-113.5308',
      launched_at: new Date('2026-01-01'),
      neighbourhood: 'Westmount',
      approved_by_admin: true,
    },
    loc: { address: '#6, 10240 124 Street NW, Edmonton, AB T5N 3W6' },
  },
  {
    biz: {
      name: 'Farrow — Jasper Ave',
      type: 'partner',
      address: '10542 Jasper Avenue',
      city: 'Edmonton, AB',
      hours: 'Daily 8–3',
      contact: '780-761-6800',
      latitude: '53.5444',
      longitude: '-113.4977',
      launched_at: new Date('2026-01-01'),
      neighbourhood: 'Downtown Edmonton',
      approved_by_admin: true,
    },
    loc: { address: '10542 Jasper Avenue, Edmonton, AB T5J 1Z7' },
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
