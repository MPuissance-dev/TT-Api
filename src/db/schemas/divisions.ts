import { pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'

export const divisions = pgTable('divisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull(),
  ffttId: varchar('fftt_id', { length: 50 }),
  level: varchar('level', { length: 50 }).notNull(),
  ...timestamps,
  },
  (table) => [unique('divisions_fftt_id_unique').on(table.ffttId)]
)

export type Division = typeof divisions.$inferSelect
