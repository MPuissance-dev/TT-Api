/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-enable @typescript-eslint/ban-ts-comment */
import type { Database } from './index.js'
import { demoSeedData } from './fixtures/demo-data.js'
import { clubs } from './schemas/clubs.js'
import { divisions } from './schemas/index.js'
import { teams } from './schemas/teams.js'
import { players } from './schemas/players.js'
import { pools } from './schemas/pools.js'
import { pool_team } from './schemas/index.js'
import { encounters } from './schemas/index.js'
import { encounter_lineup } from './schemas/index.js'
import { single_matchs } from './schemas/index.js'
import { double_matchs } from './schemas/index.js'
import { team_ranking } from './schemas/index.js'

async function insert(db: Database, table: unknown, values: unknown[]) {
  await db.insert(table).values(values)
}

export async function seedDatabase(db: Database) {
  await insert(db, clubs, demoSeedData.clubs)
  await insert(db, divisions, demoSeedData.divisions)
  await insert(db, teams, demoSeedData.teams)
  await insert(db, players, demoSeedData.players)
  await insert(db, pools, demoSeedData.pools)
  await insert(db, pool_team, demoSeedData.poolTeams)
  await insert(db, team_ranking, demoSeedData.teamRankings)
  await insert(db, encounters, demoSeedData.encounters)
  await insert(db, encounter_lineup, demoSeedData.encounterLineup)
  await insert(db, single_matchs, demoSeedData.singleMatches)
  await insert(db, double_matchs, demoSeedData.doubleMatches)
}
