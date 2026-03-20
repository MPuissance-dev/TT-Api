import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import dotenv from 'dotenv'
import * as schema from './schemas/index.js'
import * as relations from './relations.js'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle({ client: pool, schema: { ...schema, ...relations } })

export async function init_db() {
  await pool.connect()
}
