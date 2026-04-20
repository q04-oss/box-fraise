import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

const FIXES = [
  // From rossopizzeria.ca embedded map
  { id: 51, name: 'Rosso Pizzeria',           lat: '53.5234498',  lng: '-113.5125186' },
  // From Photon/OSM — Ritchie Professional Centre block (9531-9557 76 Ave NW)
  { id: 28, name: 'Kind Ice Cream — Ritchie', lat: '53.5121',     lng: '-113.4760' },
];

async function run() {
  for (const fix of FIXES) {
    await db.update(businesses)
      .set({ latitude: fix.lat, longitude: fix.lng })
      .where(eq(businesses.id, fix.id));
    console.log(`Updated ${fix.name}: ${fix.lat}, ${fix.lng}`);
  }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
