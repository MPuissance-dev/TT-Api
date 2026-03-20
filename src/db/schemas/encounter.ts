import { pgTable, uuid, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { pools } from './pools.js'
import { teams } from './teams.js'

export const encounterStatus = pgEnum('status', [
  'played',
  'scheduled',
  'reported',
])

export const encounters = pgTable('encounters', {
  id: uuid('id').primaryKey().defaultRandom(),
  pool_id: uuid('pool_id')
    .references(() => pools.id)
    .notNull(),
  home_team: uuid('home_team')
    .references(() => teams.id)
    .notNull(),
  away_team: uuid('away_team')
    .references(() => teams.id)
    .notNull(),
  played_at: timestamp('played_at').notNull(),
  championship_day_number: integer('championship_day_number').notNull(),
  home_score: integer('home_score').default(0),
  away_score: integer('away_score').default(0),
  status: encounterStatus().default('played'),
  ...timestamps,
})
