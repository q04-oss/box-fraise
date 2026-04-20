import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';

async function run() {
  const rows = await db.select({
    id: businesses.id,
    name: businesses.name,
    address: businesses.address,
    latitude: businesses.latitude,
    longitude: businesses.longitude,
    type: businesses.type,
  }).from(businesses).orderBy(businesses.id);
  rows.forEach(r => console.log(`${r.id}\t${r.type}\t${r.latitude}\t${r.longitude}\t${r.name} — ${r.address}`));
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
