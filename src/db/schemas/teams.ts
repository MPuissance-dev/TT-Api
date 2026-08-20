import { pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { clubs } from './clubs.js'

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id')
    .references(() => clubs.id)
    .notNull(),
  ffttId: varchar('fftt_id', { length: 32 }),
  ...timestamps,
  },
  (table) => [unique('teams_fftt_id_unique').on(table.ffttId)]
)

export type Team = typeof teams.$inferSelect