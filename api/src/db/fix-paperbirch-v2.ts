import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

const FIXES = [
  { id: 15, name: 'Paper Birch Books', lat: '53.5166976', lng: '-113.508352'  },
  { id: 16, name: 'True Blue',         lat: '53.5167200', lng: '-113.508320'  },
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
