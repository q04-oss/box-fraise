import 'dotenv/config';
import { db } from './index';
import { businesses, locations } from './schema';
import { eq } from 'drizzle-orm';

const LOCATIONS = [
  {
    name: 'Sunterra Market — Bankers Hall',
    address: '+15 Level, 855 2 Street S.W.',
    city: 'Calgary, AB',
    neighbourhood: 'Downtown Calgary',
    contact: '(403) 269-3610',
    latitude: '51.0455173',
    longitude: '-114.0692971',
  },
  {
    name: 'Sunterra Market — Britannia Plaza',
    address: '803 49 Avenue S.W.',
    city: 'Calgary, AB',
    neighbourhood: 'Britannia',
    contact: '(403) 287-0553',
    latitude: '51.0093170',
    longitude: '-114.0819540',
  },
  {
    name: 'Sunterra Market — Kensington Road',
    address: '2536 Kensington Road N.W.',
    city: 'Calgary, AB',
    neighbourhood: 'Kensington',
    contact: '(403) 685-1535',
    latitude: '51.0573000',
    longitude: '-114.0972000',
  },
  {
    name: 'Sunterra Market — Keynote',
    address: '200 12 Avenue S.E.',
    city: 'Calgary, AB',
    neighbourhood: 'Victoria Park',
    contact: '(403) 261-6772',
    latitude: '51.0414910',
    longitude: '-114.0605990',
  },
  {
    name: 'Sunterra Market — West Market Square',
    address: '1851 Sirocco Drive S.W.',
    city: 'Calgary, AB',
    neighbourhood: 'West Springs',
    contact: '(403) 266-3049',
    latitude: '51.0372140',
    longitude: '-114.1682520',
  },
];

async function run() {
  for (const loc of LOCATIONS) {
    const existing = await db.select().from(businesses).where(eq(businesses.name, loc.name));
    if (existing.length > 0) {
      console.log('Already exists:', loc.name, 'id:', existing[0].id);
      continue;
    }

    const [biz] = await db.insert(businesses).values({
      name: loc.name,
      type: 'partner',
      address: loc.address,
      city: loc.city,
      neighbourhood: loc.neighbourhood,
      contact: loc.contact,
      latitude: loc.latitude,
      longitude: loc.longitude,
      launched_at: new Date('2026-04-20'),
      approved_by_admin: true,
    }).returning();

    await db.insert(locations).values({
      name: loc.name,
      address: `${loc.address}, ${loc.city}`,
      active: true,
      business_id: biz.id,
    });

    console.log('Created:', biz.name, 'id:', biz.id);
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
