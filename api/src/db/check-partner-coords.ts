import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { inArray } from 'drizzle-orm';

async function run() {
  const rows = await db.select({
    id: businesses.id,
    name: businesses.name,
    latitude: businesses.latitude,
    longitude: businesses.longitude,
  }).from(businesses).where(inArray(businesses.name, [
    'Rosso Pizzeria', 'Rosewood Foods', 'Bar Henry',
    'Seoul Fried Chicken', 'Farrow — Garneau', 'Farrow — Ritchie',
    'Kind Ice Cream — Wîhkwêntôwin', 'Kind Ice Cream — Ritchie',
    'Va Cafe', 'Olia', 'Ace Coffee',
  ]));
  rows.forEach(r => console.log(`${r.id}\t${r.name}\t${r.latitude}\t${r.longitude}`));
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
