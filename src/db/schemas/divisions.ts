import {
  integer,
  pgEnum,
  pgTable,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { seasons } from './seasons.js'

export const divisionCategory = pgEnum('division_category', [
  'senior',
  'youth',
  'veteran',
])

export const divisions = pgTable(
  'divisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seasonId: uuid('season_id')
      .references(() => seasons.id)
      .notNull(),
    /** Championship phase, 1 from September to December and 2 from January to May. */
    phase: integer('phase').notNull().default(1),
    name: varchar('name', { length: 50 }).notNull(),
    /** Tells the senior championship apart from the youth and veteran ones. */
    category: divisionCategory('category').notNull().default('senior'),
    ffttId: varchar('fftt_id', { length: 50 }),
    level: varchar('level', { length: 50 }).notNull(),
    ...timestamps,
  },
  (table) => [
    unique('divisions_fftt_id_unique').on(
      table.ffttId,
      table.seasonId,
      table.phase
    ),
  ]
)

export type Division = typeof divisions.$inferSelect
