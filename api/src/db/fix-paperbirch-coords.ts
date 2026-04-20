import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

// 10825/10827 95 Street NW, McCauley — confirmed via bus stop at 95 St & 108 Ave
const FIXES = [
  { id: 15, name: 'Paper Birch Books', lat: '53.5559', lng: '-113.4844' },
  { id: 16, name: 'True Blue',         lat: '53.5559', lng: '-113.4844' },
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
