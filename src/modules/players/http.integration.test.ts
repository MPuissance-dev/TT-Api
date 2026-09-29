import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from '../../server.js'
import { createTestDatabase } from '../../db/testing/test-database.js'
import { seedDatabase } from '../../db/seed.js'
import { encounter_lineup } from '../../db/schemas/index.js'

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

const alice = {
  id: '00000000-0000-0000-0000-000000000031',
  fullName: 'Alice Dupont',
  points: 500,
}
const bob = {
  id: '00000000-0000-0000-0000-000000000032',
  fullName: 'Bob Martin',
  points: 750,
}
const clara = {
  id: '00000000-0000-0000-0000-000000000033',
  fullName: 'Clara Durand',
  points: 600,
}
const david = {
  id: '00000000-0000-0000-0000-000000000034',
  fullName: 'David Petit',
  points: 800,
}
const paris1 = {
  id: '00000000-0000-0000-0000-000000000021',
  name: 'TT Paris 1',
  clubName: 'TT Paris',
}
const paris2 = {
  id: '00000000-0000-0000-0000-000000000022',
  name: 'TT Paris 2',
  clubName: 'TT Paris',
}
const lyon1 = {
  id: '00000000-0000-0000-0000-000000000023',
  name: 'TT Lyon 1',
  clubName: 'TT Lyon',
}
const nationaleDay1 = {
  id: '00000000-0000-0000-0000-000000000061',
  championshipDayNumber: 1,
  played_at: '2026-01-10T00:00:00.000Z',
  status: 'PLAYED',
  homeTeam: paris1,
  awayTeam: lyon1,
  homeScore: 3,
  awayScore: 1,
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

  const get = async (url: string) => {
    const response = await app.inject({ method: 'GET', url })
    return { statusCode: response.statusCode, body: response.json() }
  }

  return Object.assign(get, { database: testDatabase.database })
}

test('GET /api/players/:playerId details the games of a player over a phase', async (t) => {
  const get = await setUp(t)

  const { statusCode, body } = await get(
    `/api/players/${alice.id}?season=2025/2026&phase=2`
  )

  assert.equal(statusCode, 200)
  assert.deepEqual(body, {
    ...alice,
    firstName: 'Alice',
    lastName: 'Dupont',
    clubName: 'TT Paris',
    season: '2025/2026',
    phase: 2,
    record: {
      encounters: 1,
      singles: { won: 1, lost: 0 },
      doubles: { won: 1, lost: 0 },
    },
    teams: [{ team: paris1, appearances: 1 }],
    encounters: [
      {
        encounter: nationaleDay1,
        category: 'senior',
        team: paris1,
        games: [
          {
            number: 1,
            type: 'SINGLE',
            partner: null,
            opponents: [clara],
            result: 'WON',
            scoreFor: 3,
            scoreAgainst: 1,
            setDetails: '11/9 8/11 11/5 11/7',
          },
          {
            number: 2,
            type: 'DOUBLE',
            partner: bob,
            opponents: [clara, david],
            result: 'WON',
            scoreFor: 3,
            scoreAgainst: 0,
            setDetails: null,
          },
        ],
      },
    ],
  })
})

test('GET /api/players/:playerId reads the games from the side of the player', async (t) => {
  const get = await setUp(t)

  const { body } = await get(
    `/api/players/${clara.id}?season=2025/2026&phase=2`
  )

  assert.deepEqual(body.record.singles, { won: 0, lost: 1 })
  assert.deepEqual(body.encounters[0].games[0], {
    number: 1,
    type: 'SINGLE',
    partner: null,
    opponents: [alice],
    result: 'LOST',
    scoreFor: 1,
    scoreAgainst: 3,
    setDetails: '9/11 11/8 5/11 7/11',
  })
})

test('GET /api/players/:playerId counts the encounters a player only appears on the result sheet of', async (t) => {
  const get = await setUp(t)

  const { body } = await get(`/api/players/${bob.id}?season=2025/2026&phase=2`)

  assert.deepEqual(body.teams, [
    { team: paris1, appearances: 1 },
    { team: paris2, appearances: 1 },
  ])
  assert.deepEqual(body.record, {
    encounters: 2,
    singles: { won: 0, lost: 1 },
    doubles: { won: 1, lost: 0 },
  })
})

test('GET /api/players/:playerId is empty for a phase not played, and 404 for an unknown player', async (t) => {
  const get = await setUp(t)

  const { statusCode, body } = await get(
    `/api/players/${alice.id}?season=2025/2026&phase=1`
  )
  assert.equal(statusCode, 200)
  assert.deepEqual([body.teams, body.encounters], [[], []])
  assert.equal(body.record.encounters, 0)

  assert.equal(
    (await get('/api/players/00000000-0000-0000-0000-000000000099')).statusCode,
    404
  )
  assert.equal((await get('/api/players/not-an-id')).statusCode, 404)
})

test('GET /api/players/:playerId covers every category and tells each encounter apart', async (t) => {
  const get = await setUp(t)
  await get.database.insert(encounter_lineup).values({
    encounter_id: '00000000-0000-0000-0000-000000000063',
    player_id: alice.id,
    team_id: paris1.id,
  })

  const { body } = await get(
    `/api/players/${alice.id}?season=2025/2026&phase=2`
  )

  assert.deepEqual(
    body.encounters.map(
      (entry: { encounter: { id: string }; category: string }) => [
        entry.encounter.id,
        entry.category,
      ]
    ),
    [
      [nationaleDay1.id, 'senior'],
      ['00000000-0000-0000-0000-000000000063', 'youth'],
    ]
  )
  assert.deepEqual(body.teams, [{ team: paris1, appearances: 2 }])
  assert.equal(body.record.encounters, 2)
})
