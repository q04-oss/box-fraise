import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

// Each entry: [business name in DB, address to geocode]
const FIXES: { name: string; address: string }[] = [
  { name: 'Rosewood Foods',          address: '101, 10150 100 Street NW, Edmonton, AB' },
  { name: 'Rosso Pizzeria',          address: '8738 109 Street NW, Edmonton, AB' },
  { name: 'Seoul Fried Chicken',     address: '101, 10145 104 Street NW, Edmonton, AB' },
  { name: 'Farrow — Garneau',        address: '8422 109 Street NW, Edmonton, AB' },
  { name: 'Farrow — Ritchie',        address: '9855 76 Avenue NW, Edmonton, AB' },
  { name: 'Bar Henry',               address: '160, 10220 103 Avenue NW, Edmonton, AB' },
  { name: 'Kind Ice Cream — Wîhkwêntôwin', address: '12017 102 Avenue NW, Edmonton, AB' },
  { name: 'Kind Ice Cream — Ritchie', address: '9551 76 Avenue NW, Edmonton, AB' },
  { name: 'Va Cafe',                 address: '12024 Jasper Avenue, Edmonton, AB' },
  { name: 'Olia',                    address: '12016 Jasper Avenue, Edmonton, AB' },
  { name: 'Ace Coffee',              address: '11053 86 Avenue NW, Edmonton, AB' },
];

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'box-fraise-geocoder/1.0' },
  });
  if (!res.ok) return null;
  const data = await res.json() as any[];
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function run() {
  for (const { name, address } of FIXES) {
    process.stdout.write(`Geocoding ${name}... `);
    await new Promise(r => setTimeout(r, 1100)); // Nominatim rate limit: 1 req/sec
    const coords = await geocode(address);
    if (!coords) {
      console.log(`FAILED (no result for "${address}")`);
      continue;
    }
    await db.update(businesses)
      .set({ latitude: String(coords.lat), longitude: String(coords.lng) })
      .where(eq(businesses.name, name));
    console.log(`lat=${coords.lat}, lng=${coords.lng}`);
  }
  console.log('\nDone.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
