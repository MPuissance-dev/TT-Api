import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'

export const clubs = pgTable('clubs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 15 }).notNull(),
  numero: varchar('numero', { length: 15 }).notNull(),
  ...timestamps,
})

export type Club = typeof clubs.$inferSelect