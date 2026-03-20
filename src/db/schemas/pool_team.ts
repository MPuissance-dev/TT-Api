import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'
import { pools } from './pools.js'
import { teams } from './teams.js'

export const pool_team = pgTable(
  'pool_team',
  {
    pool_id: uuid('pool_id')
      .references(() => pools.id)
      .notNull(),
    team_id: uuid('team_id')
      .references(() => teams.id)
      .notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.pool_id, table.team_id] })]
)

export type PoolTeam = typeof pool_team.$inferSelect