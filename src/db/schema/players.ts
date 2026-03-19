import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { clubs } from './clubs.js'

export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('firstName', { length: 15 }).notNull(),
  lastName: varchar('lastName', { length: 15 }).notNull(),
  rank: varchar('rank', { length: 15 }).notNull(),
  clubId: uuid('club_id')
    .references(() => clubs.id)
    .notNull(),
  ...timestamps,
})
