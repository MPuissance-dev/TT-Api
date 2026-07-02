import { db } from './index.js'
import { clubs } from './schemas/clubs.js'
import { divisions } from './schemas/index.js'
import { double_matchs } from './schemas/index.js'
import { encounter_lineup } from './schemas/index.js'
import { encounters } from './schemas/index.js'
import { players } from './schemas/players.js'
import { pool_team } from './schemas/index.js'
import { pools } from './schemas/pools.js'
import { single_matchs } from './schemas/index.js'
import { team_ranking } from './schemas/index.js'
import { teams } from './schemas/teams.js'
import { seedDatabase } from './seed.js'
import { reset } from 'drizzle-seed'

async function run() {
  try {
    await reset(db, {
      clubs,
      divisions,
      double_matchs,
      encounter_lineup,
      encounters,
      players,
      pool_team,
      pools,
      single_matchs,
      team_ranking,
      teams,
    })
    console.log('Seeding de la database...')
    await seedDatabase(db)
    console.log('Seed terminé ✅')
    process.exit(0)
  } catch (err) {
    console.error('Seed échoué ❌', err)
    process.exit(1)
  }
}

run()

