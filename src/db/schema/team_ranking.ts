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
    looses: integer('looses'),
    ...timestamps,
  },
  (table) => [unique().on(table.pool_id, table.team_id)]
)
