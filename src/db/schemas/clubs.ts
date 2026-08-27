import { pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'

export const clubs = pgTable(
  'clubs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull(),
    numero: varchar('numero', { length: 15 }).notNull(),
    ffttId: varchar('fftt_id', { length: 32 }),
    ...timestamps,
  },
  (table) => [unique('clubs_fftt_id_unique').on(table.ffttId)]
)

export type Club = typeof clubs.$inferSelect
