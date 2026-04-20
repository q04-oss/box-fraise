import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(businesses).set({ latitude: '53.5206409', longitude: '-113.5123616' }).where(eq(businesses.id, 47));
  console.log('Updated Farrow — Garneau: 53.5206409, -113.5123616');

  await db.update(businesses).set({ latitude: '53.5553294', longitude: '-113.483898' }).where(eq(businesses.id, 15));
  console.log('Updated Paper Birch Books: 53.5553294, -113.483898');

  await db.update(businesses).set({ latitude: '53.518244', longitude: '-113.5025601' }).where(eq(businesses.id, 37));
  console.log('Updated Labo Coffee: 53.518244, -113.5025601');

  await db.update(businesses).set({ latitude: '53.5182284', longitude: '-113.5038203' }).where(eq(businesses.id, 38));
  console.log('Updated The Observatory: 53.5182284, -113.5038203');

  await db.update(businesses).set({ latitude: '53.5178942', longitude: '-113.4987324' }).where(eq(businesses.id, 23));
  console.log('Updated The Blackdog Freehouse: 53.5178942, -113.4987324');

  await db.update(businesses).set({ latitude: '53.518246', longitude: '-113.4991802' }).where(eq(businesses.id, 36));
  console.log('Updated GravityPope Footwear: 53.518246, -113.4991802');

  await db.update(businesses).set({ latitude: '53.5182396', longitude: '-113.4981711' }).where(eq(businesses.id, 35));
  console.log('Updated GravityPope Tailored Goods: 53.5182396, -113.4981711');

  await db.update(businesses).set({ latitude: '53.5183127', longitude: '-113.4959182' }).where(eq(businesses.id, 24));
  console.log('Updated Kluane Mountaineering: 53.5183127, -113.4959182');

  await db.update(businesses).set({ latitude: '53.519263', longitude: '-113.4957299' }).where(eq(businesses.id, 55));
  console.log('Updated Old Strathcona Farmers Market: 53.519263, -113.4957299');

  await db.update(businesses).set({ latitude: '53.51263', longitude: '-113.476381' }).where(eq(businesses.id, 22));
  console.log('Updated Little Duchess: 53.51263, -113.476381');

  await db.update(businesses).set({ latitude: '53.5121313', longitude: '-113.4855116' }).where(eq(businesses.id, 48));
  console.log('Updated Farrow — Ritchie: 53.5121313, -113.4855116');

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
