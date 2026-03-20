import { pgTable, uuid, varchar, integer } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'

export const divisions = pgTable('divisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 15 }).notNull(),
  level: integer('level').notNull(),
  ...timestamps,
})

export type Division = typeof divisions.$inferSelect
