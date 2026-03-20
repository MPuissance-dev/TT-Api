import { pgTable, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { clubs } from './clubs.js'

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id')
    .references(() => clubs.id)
    .notNull(),
  ...timestamps,
})

export type Team = typeof teams.$inferSelect