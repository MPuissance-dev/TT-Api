import { integer, pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { clubs } from './clubs.js'

export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('firstName', { length: 32 }).notNull(),
  lastName: varchar('lastName', { length: 32 }).notNull(),
  ffttId: varchar('fftt_id', { length: 32 }),
  points: integer('points').notNull(),
  clubId: uuid('club_id')
    .references(() => clubs.id)
    .notNull(),
  ...timestamps,
  },
  (table) => [unique('players_fftt_id_unique').on(table.ffttId)]
)

export type Player = typeof players.$inferSelect