import { pgTable, uuid, integer, unique } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { pools } from './pools.js'
import { teams } from './teams.js'

export const team_ranking = pgTable(
  'team_ranking',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pool_id: uuid('pool_id')
      .references(() => pools.id)
      .notNull(),
    team_id: uuid('team_id')
      .references(() => teams.id)
      .notNull(),
    rank: integer('rank'),
    points: integer('points'),
    played: integer('played'),
    wins: integer('wins'),
    draws: integer('draws'),
    losses: integer('losses'),
    /** Points deducted by the federation, a tie breaker of the ranking. */
    penalties: integer('penalties'),
    /** Individual games won and lost, the first tie breaker of the ranking. */
    games_won: integer('games_won'),
    games_lost: integer('games_lost'),

    ...timestamps,
  },
  (table) => [unique().on(table.pool_id, table.team_id)]
)

export type TeamRanking = typeof team_ranking.$inferSelect
