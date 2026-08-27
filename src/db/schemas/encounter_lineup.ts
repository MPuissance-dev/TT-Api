import { pgTable, uuid, primaryKey, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { teams } from './teams.js'
import { encounters } from './encounter.js'
import { players } from './players.js'

export const encounter_lineup = pgTable(
  'encounter_lineup',
  {
    encounter_id: uuid('encounter_id')
      .references(() => encounters.id)
      .notNull(),
    player_id: uuid('player_id')
      .references(() => players.id)
      .notNull(),
    team_id: uuid('team_id')
      .references(() => teams.id)
      .notNull(),
    /** Slot on the result sheet: A to D at home, W to Z away. */
    position: varchar('position', { length: 2 }),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.encounter_id, table.player_id] })]
)

export type EncounterLineup = typeof encounter_lineup.$inferSelect
