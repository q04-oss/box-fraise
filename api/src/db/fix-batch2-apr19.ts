import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses).set({ latitude: '53.4714116', longitude: '-113.4854599' }).where(eq(businesses.id, 41));
  console.log('Updated White Rabbit — 99 Street: 53.4714116, -113.4854599');

  await db.update(businesses).set({ latitude: '53.4554074', longitude: '-113.5639472' }).where(eq(businesses.id, 26));
  console.log("Updated Yelo'd — Terwillegar: 53.4554074, -113.5639472");

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
