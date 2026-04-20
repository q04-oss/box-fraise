import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { ilike } from 'drizzle-orm';

async function run() {
  const before = await db.select({ id: businesses.id, name: businesses.name, latitude: businesses.latitude, longitude: businesses.longitude })
    .from(businesses)
    .where(ilike(businesses.name, '%shade%'));
  console.log('Before:', before);

  for (const biz of before) {
    await db.update(businesses)
      .set({ latitude: '53.5420177', longitude: '-113.5014963' })
      .where(ilike(businesses.name, '%shade%'));
  }

  const after = await db.select({ id: businesses.id, name: businesses.name, latitude: businesses.latitude, longitude: businesses.longitude })
    .from(businesses)
    .where(ilike(businesses.name, '%shade%'));
  console.log('After:', after);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
