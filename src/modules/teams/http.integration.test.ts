import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from '../../server.js'
import { createTestDatabase } from '../../db/testing/test-database.js'
import { seedDatabase } from '../../db/seed.js'

const databaseUrl = process.env.DATABASE_URL

if (databaseUrl === undefined) {
  throw new Error(
    'DATABASE_URL is required to run HTTP integration tests against PostgreSQL'
  )
}

const testConfig = {
  PORT: '0',
  DATABASE_URL: databaseUrl,
  FFTT_CLUB_NUMBER: 'P001',
}

const paris1 = {
  id: '00000000-0000-0000-0000-000000000021',
  name: 'TT Paris 1',
  clubName: 'TT Paris',
}
const lyon1 = {
  id: '00000000-0000-0000-0000-000000000023',
  name: 'TT Lyon 1',
  clubName: 'TT Lyon',
}

const setUp = async (t: test.TestContext) => {
  const testDatabase = createTestDatabase()
  await testDatabase.truncate()
  await seedDatabase(testDatabase.database)

  const app = await createServer({ logger: false, config: testConfig })

  t.after(async () => {
    await app.close()
    await testDatabase.close()
  })

  return async (url: string) => {
    const response = await app.inject({ method: 'GET', url })
    return { statusCode: response.statusCode, body: response.json() }
  }
}

test('GET /api/teams/:teamId details the calendar, ranking and players of a team over a phase', async (t) => {
  const get = await setUp(t)

  const { statusCode, body } = await get(
    `/api/teams/${paris1.id}?season=2025/2026&phase=2`
  )

  assert.equal(statusCode, 200)
  assert.deepEqual(body, {
    ...paris1,
    season: '2025/2026',
    phase: 2,
    category: 'senior',
    division: { name: 'Nationale', level: 'Nationale', echelon: null },
    pool: 'Poule A',
    ranking: [
      {
        rank: 1,
        team: paris1,
        points: 6,
        played: 2,
        wins: 2,
        draws: 0,
        losses: 0,
        penalties: null,
        gamesWon: null,
        gamesLost: null,
      },
      {
        rank: 2,
        team: lyon1,
        points: 0,
        played: 2,
        wins: 0,
        draws: 0,
        losses: 2,
        penalties: null,
        gamesWon: null,
        gamesLost: null,
      },
    ],
    calendar: [
      {
        id: '00000000-0000-0000-0000-000000000061',
        championshipDayNumber: 1,
        played_at: '2026-01-10T00:00:00.000Z',
        status: 'PLAYED',
        homeTeam: paris1,
        awayTeam: lyon1,
        homeScore: 3,
        awayScore: 1,
      },
    ],
    players: [
      {
        id: '00000000-0000-0000-0000-000000000031',
        fullName: 'Alice Dupont',
        points: 500,
        appearances: 1,
      },
    ],
  })
})

test('GET /api/teams/:teamId falls back on the encounters to find the pool of a team without ranking', async (t) => {
  const get = await setUp(t)

  const { body } = await get(
    `/api/teams/${paris1.id}?season=2025/2026&phase=2&category=youth`
  )

  assert.equal(body.pool, 'Poule Jeunes')
  assert.deepEqual(body.ranking, [])
  assert.deepEqual(
    body.calendar.map((encounter: { id: string }) => encounter.id),
    ['00000000-0000-0000-0000-000000000063']
  )
  assert.deepEqual(body.players, [])
})

test('GET /api/teams/:teamId is empty for a phase the team is not engaged in, and 404 for an unknown team', async (t) => {
  const get = await setUp(t)

  const { statusCode, body } = await get(
    `/api/teams/${paris1.id}?season=2025/2026&phase=1`
  )
  assert.equal(statusCode, 200)
  assert.equal(body.division, null)
  assert.equal(body.pool, null)
  assert.deepEqual([body.ranking, body.calendar, body.players], [[], [], []])

  assert.equal(
    (await get('/api/teams/00000000-0000-0000-0000-000000000099')).statusCode,
    404
  )
  assert.equal((await get('/api/teams/not-an-id')).statusCode, 404)
})
