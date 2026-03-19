import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core'
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
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.encounter_id, table.player_id] })]
)
