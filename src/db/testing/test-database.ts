import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as schema from '../schemas/index.js'
import * as relations from '../relations.js'
import type { Database } from '../index.js'

const managedTables = [
  'encounter_lineup',
  'encounter_matches',
  'team_ranking',
  'encounters',
  'pool_team',
  'pools',
  'divisions',
  'players',
  'teams',
  'clubs',
  'seasons',
]

export interface TestDatabase {
  database: Database
  truncate: () => Promise<void>
  close: () => Promise<void>
}

export const createTestDatabase = (): TestDatabase => {
  const connectionString = process.env.DATABASE_URL
  if (connectionString === undefined) {
    throw new Error(
      'DATABASE_URL is required to run integration tests against PostgreSQL'
    )
  }

  const pool = new Pool({ connectionString })
  const database = drizzle({
    client: pool,
    schema: { ...schema, ...relations },
  }) as unknown as Database

  return {
    database,
    async truncate() {
      await database.execute(
        sql.raw(
          `TRUNCATE TABLE ${managedTables.join(', ')} RESTART IDENTITY CASCADE`
        )
      )
    },
    async close() {
      await pool.end()
    },
  }
}
