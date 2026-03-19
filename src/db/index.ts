import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import dotenv from 'dotenv'
import { schemas } from './schema/schemas.js'
import { seedDatabase } from './seed.js'
import { reset } from 'drizzle-seed'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function init_db(seeded = false) {
  const db = drizzle({ client: pool })
  if (seeded) {
    await reset(db, schemas)
    console.log('Seeding de la database...')
    await seedDatabase(db)
      .then(() => {
        console.log('Seed terminé ✅')
        process.exit(0)
      })
      .catch((err) => {
        console.error('Seed échoué ❌', err)
        process.exit(1)
      })
  }
}
