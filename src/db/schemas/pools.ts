import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { divisions } from './divisions.js'

export const pools = pgTable('pools', {
  id: uuid('id').primaryKey().defaultRandom(),
  divisionId: uuid('division_id')
    .references(() => divisions.id)
    .notNull(),
  name: varchar('name', { length: 15 }).notNull(),
  ...timestamps,
})
