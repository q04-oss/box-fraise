import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  // Jasper Ave location
  const e1 = await db.select().from(businesses).where(eq(businesses.name, 'Coffee Bureau — Jasper Ave'));
  if (e1.length === 0) {
    const [biz] = await db.insert(businesses).values({
      name: 'Coffee Bureau — Jasper Ave',
      type: 'partner',
      address: '10505 Jasper Avenue',
      city: 'Edmonton, AB',
      hours: 'Mon–Fri 7–3 · Closed holidays',
      latitude: '53.5444',
      longitude: '-113.4978',
      launched_at: new Date('2026-01-01'),
      description: 'Specialty coffee on Jasper Ave in downtown Edmonton.',
      neighbourhood: 'Jasper Ave – Downtown Edmonton',
      approved_by_admin: true,
    }).returning();
    await db.insert(locations).values({
      name: 'Coffee Bureau — Jasper Ave',
      address: '10505 Jasper Avenue, Edmonton, AB',
      active: true,
      business_id: biz.id,
    });
    console.log('Created:', biz.name, 'id:', biz.id);
  } else {
    console.log('Jasper Ave already exists, id:', e1[0].id);
  }

  // Mercury Block location
  const e2 = await db.select().from(businesses).where(eq(businesses.name, 'Coffee Bureau — Mercury Block'));
  if (e2.length === 0) {
    const [biz] = await db.insert(businesses).values({
      name: 'Coffee Bureau — Mercury Block',
      type: 'partner',
      address: '12316 102 Avenue',
      city: 'Edmonton, AB',
      hours: 'Mon–Fri 7–5 · Sat 8–5 · Sun & Holidays 8–4',
      latitude: '53.5510',
      longitude: '-113.5041',
      launched_at: new Date('2026-01-01'),
      description: 'Specialty coffee in the Mercury Block neighbourhood.',
      neighbourhood: 'Westmount',
      approved_by_admin: true,
    }).returning();
    await db.insert(locations).values({
      name: 'Coffee Bureau — Mercury Block',
      address: '12316 102 Avenue, Edmonton, AB',
      active: true,
      business_id: biz.id,
    });
    console.log('Created:', biz.name, 'id:', biz.id);
  } else {
    console.log('Mercury Block already exists, id:', e2[0].id);
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
