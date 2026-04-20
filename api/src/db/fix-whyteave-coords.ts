import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

const FIXES = [
  // 82 Ave (Whyte Ave) businesses
  { id: 23, name: 'The Blackdog Freehouse',    lat: '53.5178632',  lng: '-113.4987452' },
  { id: 24, name: 'Kluane Mountaineering',     lat: '53.5182647',  lng: '-113.4959314' },
  { id: 25, name: "Yelo'd Ice Cream",          lat: '53.5182647',  lng: '-113.4959314' },
  { id: 35, name: 'GravityPope',               lat: '53.5182295',  lng: '-113.4981959' },
  { id: 36, name: 'GravityPope Footwear',      lat: '53.5181606',  lng: '-113.4988378' },
  { id: 37, name: 'Labo Coffee',               lat: '53.5181956',  lng: '-113.5024036' },
  { id: 38, name: 'The Observatory',           lat: '53.5183739',  lng: '-113.5009219' },
  // 83 Ave businesses
  { id: 46, name: 'Marlo',                     lat: '53.5188754',  lng: '-113.4979628' },
  { id: 55, name: 'Old Strathcona Farmers Market', lat: '53.5197043', lng: '-113.4957347' },
  // 80 Ave
  { id: 33, name: 'Ace Coffee — 80 Avenue',    lat: '53.5159419',  lng: '-113.4905071' },
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
