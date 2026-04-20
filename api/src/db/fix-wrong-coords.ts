import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

// Corrected coordinates based on Edmonton address system
// Rosso Pizzeria: 8738 109 St NW = near 87 Ave & 109 St (Garneau)
// Kind Ice Cream — Ritchie: 9551 76 Ave NW = near 95-96 St & 76 Ave (Ritchie)
const FIXES = [
  { id: 51, name: 'Rosso Pizzeria',           lat: '53.5250', lng: '-113.5091' },
  { id: 28, name: 'Kind Ice Cream — Ritchie', lat: '53.5148', lng: '-113.4870' },
];

async function run() {
  for (const fix of FIXES) {
    await db.update(businesses)
      .set({ latitude: fix.lat, longitude: fix.lng })
      .where(eq(businesses.id, fix.id));
    console.log(`Fixed ${fix.name}: ${fix.lat}, ${fix.lng}`);
  }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
