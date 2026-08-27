import { integer, pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'

export const seasons = pgTable(
  'seasons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Season label such as `2025/2026`. */
    name: varchar('name', { length: 9 }).notNull(),
    /** Calendar year the season starts in, championships running from September to May. */
    startYear: integer('start_year').notNull(),
    ...timestamps,
  },
  (table) => [unique('seasons_name_unique').on(table.name)]
)

export type Season = typeof seasons.$inferSelect
