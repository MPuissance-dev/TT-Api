import {
  integer,
  pgEnum,
  pgTable,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { encounters } from './encounter.js'
import { players } from './players.js'

export const encounterMatchType = pgEnum('encounter_match_type', [
  'single',
  'double',
])

export const encounterMatchWinner = pgEnum('encounter_match_winner', [
  'home',
  'away',
])

/**
 * One game of an encounter, singles and doubles alike: a double is a single
 * with a second player on each side.
 */
export const encounter_matches = pgTable(
  'encounter_matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encounter_id: uuid('encounter_id')
      .references(() => encounters.id)
      .notNull(),
    /** Position of the game on the result sheet, starting at 1. */
    number: integer('number').notNull(),
    type: encounterMatchType('type').notNull(),
    /**
     * Nullable because a forfeited game names no opponent, and because a player
     * the FFTT does not license under this club cannot be resolved.
     */
    home_player_id: uuid('home_player_id').references(() => players.id),
    home_player2_id: uuid('home_player2_id').references(() => players.id),
    away_player_id: uuid('away_player_id').references(() => players.id),
    away_player2_id: uuid('away_player2_id').references(() => players.id),
    /** Sets won by each side. */
    home_score: integer('home_score'),
    away_score: integer('away_score'),
    /** `null` when the game was not played, typically a forfeit. */
    winner: encounterMatchWinner('winner'),
    /** Raw set-by-set detail published by the FFTT, such as `11/9 8/11 11/5`. */
    set_details: varchar('set_details', { length: 120 }),
    ...timestamps,
  },
  (table) => [
    unique('encounter_matches_number_unique').on(
      table.encounter_id,
      table.number
    ),
  ]
)

export type EncounterMatch = typeof encounter_matches.$inferSelect
