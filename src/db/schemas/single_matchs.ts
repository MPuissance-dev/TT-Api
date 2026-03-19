import { pgTable, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { encounters } from './encounter.js'
import { players } from './players.js'

export const single_matchs = pgTable('single_matchs', {
  id: uuid('id').primaryKey().defaultRandom(),
  encounter_id: uuid('encounter_id')
    .references(() => encounters.id)
    .notNull(),
  home_player_id: uuid('home_player_id')
    .references(() => players.id)
    .notNull(),
  away_player_id: uuid('away_player_id')
    .references(() => players.id)
    .notNull(),
  winner_id: uuid('winner_id')
    .references(() => players.id)
    .notNull(),
  ...timestamps,
})
