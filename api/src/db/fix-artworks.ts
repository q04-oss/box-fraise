import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses)
    .set({ latitude: '53.5423797', longitude: '-113.4911394' })
    .where(eq(businesses.id, 11));
  console.log('Updated The Artworks: 53.5423797, -113.4911394');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
