import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)

async function run() {
  const slots = await sql`
    SELECT ts.id, ts.location_id, ts.date, ts.time, ts.capacity, l.name
    FROM time_slots ts
    JOIN locations l ON l.id = ts.location_id
    ORDER BY ts.date, ts.time
    LIMIT 10
  `
  console.log(JSON.stringify(slots, null, 2))
  await sql.end()
}

run().catch(e => { console.error(e); process.exit(1) })
