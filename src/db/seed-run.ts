import { db } from './index.js'
import { clubs } from './schemas/clubs.js'
import { divisions } from './schemas/index.js'
import { encounter_matches } from './schemas/index.js'
import { encounter_lineup } from './schemas/index.js'
import { encounters } from './schemas/index.js'
import { players } from './schemas/players.js'
import { pool_team } from './schemas/index.js'
import { pools } from './schemas/pools.js'
import { team_ranking } from './schemas/index.js'
import { teams } from './schemas/teams.js'
import { seasons } from './schemas/index.js'
import { seedDatabase } from './seed.js'
import { reset } from 'drizzle-seed'

async function run() {
  try {
    await reset(db, {
      clubs,
      divisions,
      encounter_matches,
      encounter_lineup,
      encounters,
      players,
      seasons,
      pool_team,
      pools,
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
