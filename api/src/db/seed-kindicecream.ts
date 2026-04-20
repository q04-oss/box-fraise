import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

const entries = [
  {
    biz: {
      name: 'Kind Ice Cream — Wîhkwêntôwin',
      type: 'partner',
      address: '12017 102 Avenue NW',
      city: 'Edmonton, AB',
      contact: '780-509-8746',
      latitude: '53.5511',
      longitude: '-113.5219',
      launched_at: new Date('2026-01-01'),
      description: 'Kind Ice Cream in the OEX2 Building in Wîhkwêntôwin.',
      neighbourhood: 'Wîhkwêntôwin (Oliver)',
      approved_by_admin: true,
    },
    loc: { address: '12017 102 Avenue NW, Edmonton, AB' },
  },
  {
    biz: {
      name: 'Kind Ice Cream — Ritchie',
      type: 'partner',
      address: '9551 76 Avenue NW',
      city: 'Edmonton, AB',
      contact: '587-759-0080',
      latitude: '53.5148',
      longitude: '-113.4870',
      launched_at: new Date('2026-01-01'),
      description: 'Kind Ice Cream\'s original location in Ritchie.',
      neighbourhood: 'Ritchie',
      approved_by_admin: true,
    },
    loc: { address: '9551 76 Avenue NW, Edmonton, AB' },
  },
  {
    biz: {
      name: 'Kind Ice Cream — Highlands',
      type: 'partner',
      address: '6507 112 Avenue NW',
      city: 'Edmonton, AB',
      contact: '780-474-5547',
      latitude: '53.5706',
      longitude: '-113.4672',
      launched_at: new Date('2026-01-01'),
      description: 'Kind Ice Cream in Edmonton\'s Highlands neighbourhood.',
      neighbourhood: 'Highlands',
      approved_by_admin: true,
    },
    loc: { address: '6507 112 Avenue NW, Edmonton, AB' },
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
