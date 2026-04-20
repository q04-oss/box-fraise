/**
 * Seed script — time slots for all demo locations
 *
 * Generates hourly slots (09:00–17:00) for the next 6 weeks
 * for every location that currently has no slots.
 *
 * Run with:
 *   DATABASE_URL=<railway_public_url> npx tsx src/db/seed-slots.ts
 */

import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)

const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const CAPACITY = 20
const WEEKS = 6

function dateRange(weeks: number): string[] {
  const dates: string[] = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let d = 0; d < weeks * 7; d++) {
    const date = new Date(start)
    date.setDate(start.getDate() + d)
    dates.push(date.toISOString().slice(0, 10))
  }
  return dates
}

async function run() {
  // Get all locations that have no time slots yet
  const locations = await sql`
    SELECT l.id, l.name
    FROM locations l
    WHERE NOT EXISTS (
      SELECT 1 FROM time_slots ts WHERE ts.location_id = l.id
    )
  `

  if (locations.length === 0) {
    console.log('All locations already have time slots.')
    await sql.end()
    return
  }

  console.log(`Seeding slots for ${locations.length} location(s)...`)

  const dates = dateRange(WEEKS)

  for (const loc of locations) {
    console.log(`  ${loc.name} (id ${loc.id}) — ${dates.length} days × ${TIMES.length} slots`)
    const values = dates.flatMap(date =>
      TIMES.map(time => ({ location_id: loc.id, date, time, capacity: CAPACITY, booked: 0 }))
    )

    // Insert in batches of 100 to avoid hitting query size limits
    for (let i = 0; i < values.length; i += 100) {
      const batch = values.slice(i, i + 100)
      await sql`INSERT INTO time_slots ${sql(batch)}`
    }

    console.log(`    inserted ${values.length} slots`)
  }

  console.log('Done.')
  await sql.end()
}

run().catch(e => { console.error(e); process.exit(1) })
