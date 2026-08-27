import { integer, pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { clubs } from './clubs.js'

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clubId: uuid('club_id')
      .references(() => clubs.id)
      .notNull(),
    /** Team label as published by the FFTT, for instance `Mellinet TT 3`. */
    name: varchar('name', { length: 100 }).notNull(),
    /**
     * Accent and case insensitive form of the name. A team keeps the same identity across
     * seasons whereas its FFTT identifier is reissued every phase, so uniqueness relies on it.
     */
    normalizedName: varchar('normalized_name', { length: 100 }).notNull(),
    /** Rank of the team inside its club, extracted from the label. */
    number: integer('number'),
    ffttId: varchar('fftt_id', { length: 32 }),
    ...timestamps,
  },
  (table) => [
    unique('teams_club_id_normalized_name_unique').on(
      table.clubId,
      table.normalizedName
    ),
  ]
)

export type Team = typeof teams.$inferSelect
