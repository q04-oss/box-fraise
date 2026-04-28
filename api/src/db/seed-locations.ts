/**
 * Seed script — global demo locations
 *
 * Inserts showcase businesses and locations across major cities
 * for demo and App Store review purposes.
 *
 * Run with:
 *   DATABASE_URL=<your_railway_url> npx tsx src/db/seed-locations.ts
 */

import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)

const businesses = [
  {
    name: 'Box Box Fraise — Montréal',
    type: 'collection',
    address: '1234 Rue Saint-Denis, Montréal, QC H2X 3K4',
    city: 'Montréal',
    location_type: 'house_chocolate',
    latitude: '45.5200',
    longitude: '-73.5800',
    hours: 'Tue–Sat 11:00–18:00',
    neighbourhood: 'Plateau-Mont-Royal',
    description: 'The original Maison Fraise atelier on Saint-Denis.',
    approved_by_admin: true,
  },
  {
    name: 'Box Fraise — Paris 3e',
    type: 'collection',
    address: '22 Rue de Bretagne, 75003 Paris, France',
    city: 'Paris',
    location_type: 'house_chocolate',
    latitude: '48.8620',
    longitude: '2.3590',
    hours: 'Wed–Sun 10:00–19:00',
    neighbourhood: 'Le Marais',
    description: 'Chocolate covered strawberries in the heart of Le Marais.',
    approved_by_admin: true,
  },
  {
    name: 'Box Fraise — London',
    type: 'collection',
    address: "18 Lamb's Conduit Street, London WC1N 3LJ, UK",
    city: 'London',
    location_type: 'collab_chocolate',
    latitude: '51.5230',
    longitude: '-0.1190',
    hours: 'Tue–Sat 11:00–18:00',
    neighbourhood: 'Bloomsbury',
    description: 'Box Fraise atelier in Bloomsbury.',
    approved_by_admin: true,
  },
  {
    name: 'Box Fraise — New York',
    type: 'collection',
    address: '245 Bleecker Street, New York, NY 10014, USA',
    city: 'New York',
    location_type: 'collab_chocolate',
    latitude: '40.7310',
    longitude: '-74.0020',
    hours: 'Mon–Sat 12:00–20:00',
    neighbourhood: 'West Village',
    description: 'Box Fraise in the West Village.',
    approved_by_admin: true,
  },
  {
    name: 'Box Fraise — Tokyo',
    type: 'collection',
    address: '5-2-1 Minami-Aoyama, Minato-ku, Tokyo 107-0062, Japan',
    city: 'Tokyo',
    location_type: 'collab_chocolate',
    latitude: '35.6650',
    longitude: '139.7130',
    hours: 'Wed–Mon 11:00–19:00',
    neighbourhood: 'Aoyama',
    description: "Box Fraise in Aoyama, Tokyo.",
    approved_by_admin: true,
  },
  {
    name: 'Box Fraise — Copenhagen',
    type: 'collection',
    address: 'Jægersborggade 32, 2200 Copenhagen N, Denmark',
    city: 'Copenhagen',
    location_type: 'house_chocolate',
    latitude: '55.6940',
    longitude: '12.5460',
    hours: 'Tue–Sat 10:00–17:00',
    neighbourhood: 'Nørrebro',
    description: "A Fraise atelier on Jægersborggade, Copenhagen's artisan street.",
    approved_by_admin: true,
  },
  {
    name: 'Box Fraise — Mexico City',
    type: 'collection',
    address: 'Álvaro Obregón 168, Roma Norte, 06700 CDMX, Mexico',
    city: 'Mexico City',
    location_type: 'collab_chocolate',
    latitude: '19.4190',
    longitude: '-99.1620',
    hours: 'Tue–Sun 11:00–20:00',
    neighbourhood: 'Roma Norte',
    description: 'Box Fraise in Roma Norte, Mexico City.',
    approved_by_admin: true,
  },
  {
    name: 'Box Fraise — Sydney',
    type: 'collection',
    address: '72 Commonwealth Street, Surry Hills NSW 2010, Australia',
    city: 'Sydney',
    location_type: 'house_chocolate',
    latitude: '-33.8880',
    longitude: '151.2100',
    hours: 'Wed–Sun 10:00–18:00',
    neighbourhood: 'Surry Hills',
    description: 'The Sydney atelier in the heart of Surry Hills.',
    approved_by_admin: true,
  },
]

async function seed() {
  console.log('Seeding demo locations...')

  for (const b of businesses) {
    const [business] = await sql`
      INSERT INTO businesses (
        name, type, address, city, location_type, latitude, longitude,
        hours, neighbourhood, description, partner_name,
        launched_at, approved_by_admin
      ) VALUES (
        ${b.name}, ${b.type}, ${b.address}, ${b.city}, ${b.location_type},
        ${b.latitude ?? null}, ${b.longitude ?? null},
        ${b.hours ?? null}, ${b.neighbourhood ?? null}, ${b.description ?? null},
        ${(b as any).partner_name ?? null},
        NOW(), true
      )
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `

    if (!business) {
      console.log(`  skipped (already exists): ${b.name}`)
      continue
    }

    console.log(`  inserted business: ${business.name} (id ${business.id})`)

    await sql`
      INSERT INTO locations (name, address, active, business_id)
      VALUES (${b.name}, ${b.address}, true, ${business.id})
      ON CONFLICT DO NOTHING
    `

    console.log(`  inserted location for: ${business.name}`)
  }

  console.log('Done.')
  await sql.end()
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
