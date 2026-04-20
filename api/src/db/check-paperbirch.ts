import 'dotenv/config';
import { db } from './index';
import { businesses } from './schema';
import { ilike } from 'drizzle-orm';

db.select({ id: businesses.id, name: businesses.name })
  .from(businesses)
  .where(ilike(businesses.name, '%birch%'))
  .then(r => { console.log(r); process.exit(0); });
