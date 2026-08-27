import { pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { divisions } from './divisions.js'

export const pools = pgTable(
  'pools',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    divisionId: uuid('division_id')
      .references(() => divisions.id)
      .notNull(),
    name: varchar('name', { length: 15 }).notNull(),
    ffttId: varchar('fftt_id', { length: 32 }),
    ...timestamps,
  },
  (table) => [unique('pools_fftt_id_unique').on(table.ffttId, table.divisionId)]
)

export type Pool = typeof pools.$inferSelect
