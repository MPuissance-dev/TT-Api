import { pgTable, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { encounters } from './encounter.js'
import { players } from './players.js'

export const double_matchs = pgTable('double_matchs', {
  id: uuid('id').primaryKey().defaultRandom(),
  encounter_id: uuid('encounter_id')
    .references(() => encounters.id)
    .notNull(),
  home_player1_id: uuid('home_player1_id')
    .references(() => players.id)
    .notNull(),
  home_player2_id: uuid('home_player2_id')
    .references(() => players.id)
    .notNull(),
  away_player1_id: uuid('away_player1_id')
    .references(() => players.id)
    .notNull(),
  away_player2_id: uuid('away_player2_id')
    .references(() => players.id)
    .notNull(),
  winner1_id: uuid('winner1_id')
    .references(() => players.id)
    .notNull(),
  winner2_id: uuid('winner2_id')
    .references(() => players.id)
    .notNull(),
  ...timestamps,
})
