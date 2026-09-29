import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from '../../server.js'
import { buildExpectedEncounterResponse } from '../../db/fixtures/demo-data.js'
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

test('POST /api/encounters/encounters-search returns JSON consistent with PostgreSQL data', async (t) => {
  const testDatabase = createTestDatabase()
  await testDatabase.truncate()
  await seedDatabase(testDatabase.database)

  const app = await createServer({
    logger: false,
    config: testConfig,
  })

  t.after(async () => {
    await app.close()
    await testDatabase.close()
  })

  const response = await app.inject({
    method: 'POST',
    url: '/api/encounters/encounters-search',
    payload: { dayNumber: 1, season: '2025/2026' },
  })

  assert.equal(response.statusCode, 200)

  const expected = buildExpectedEncounterResponse(1)
  const actual = response
    .json()
    .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))

  assert.deepEqual(actual, expected)
})

test('POST /api/encounters/encounters-search only returns the senior championship unless another category is asked for', async (t) => {
  const testDatabase = createTestDatabase()
  await testDatabase.truncate()
  await seedDatabase(testDatabase.database)

  const app = await createServer({ logger: false, config: testConfig })

  t.after(async () => {
    await app.close()
    await testDatabase.close()
  })

  const search = async (payload: Record<string, unknown>) => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/encounters/encounters-search',
      payload,
    })
    assert.equal(response.statusCode, 200)

    return response
      .json()
      .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))
  }

  assert.deepEqual(
    await search({ dayNumber: 1, season: '2025/2026' }),
    buildExpectedEncounterResponse(1)
  )
  assert.deepEqual(
    await search({ dayNumber: 1, season: '2025/2026', category: 'youth' }),
    buildExpectedEncounterResponse(1, 'youth')
  )
})

test('GET /api/encounters/calendar lists the weekend of every championship day of a phase', async (t) => {
  const testDatabase = createTestDatabase()
  await testDatabase.truncate()
  await seedDatabase(testDatabase.database)

  const app = await createServer({ logger: false, config: testConfig })

  t.after(async () => {
    await app.close()
    await testDatabase.close()
  })

  const calendar = async (query: string) => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/encounters/calendar?${query}`,
    })
    assert.equal(response.statusCode, 200)
    return response.json()
  }

  assert.deepEqual(await calendar('season=2025/2026&phase=2'), {
    season: '2025/2026',
    phase: 2,
    category: 'senior',
    days: [
      { dayNumber: 1, weekend: { start: '2026-01-10', end: '2026-01-11' } },
    ],
  })
  assert.deepEqual(
    (await calendar('season=2025/2026&phase=2&category=youth')).days,
    [{ dayNumber: 1, weekend: { start: '2026-01-24', end: '2026-01-25' } }]
  )
  assert.deepEqual((await calendar('season=2025/2026&phase=1')).days, [])
})

test('GET /api/encounters/:encounterId details the games of an encounter', async (t) => {
  const testDatabase = createTestDatabase()
  await testDatabase.truncate()
  await seedDatabase(testDatabase.database)

  const app = await createServer({ logger: false, config: testConfig })

  t.after(async () => {
    await app.close()
    await testDatabase.close()
  })

  const nationaleDay1 = '00000000-0000-0000-0000-000000000061'
  const response = await app.inject({
    method: 'GET',
    url: `/api/encounters/${nationaleDay1}`,
  })
  assert.equal(response.statusCode, 200)

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

  assert.deepEqual(response.json(), {
    ...buildExpectedEncounterResponse(1).find(
      (encounter) => encounter.id === nationaleDay1
    ),
    matches: [
      {
        number: 1,
        type: 'SINGLE',
        homePlayers: [alice],
        awayPlayers: [clara],
        homeScore: 3,
        awayScore: 1,
        winner: 'HOME',
        setDetails: '11/9 8/11 11/5 11/7',
      },
      {
        number: 2,
        type: 'DOUBLE',
        homePlayers: [alice, bob],
        awayPlayers: [clara, david],
        homeScore: 3,
        awayScore: 0,
        winner: 'HOME',
        setDetails: null,
      },
    ],
  })
})

test('GET /api/encounters/:encounterId has no games until the result sheet is known', async (t) => {
  const testDatabase = createTestDatabase()
  await testDatabase.truncate()
  await seedDatabase(testDatabase.database)

  const app = await createServer({ logger: false, config: testConfig })

  t.after(async () => {
    await app.close()
    await testDatabase.close()
  })

  const jeunesDay1 = await app.inject({
    method: 'GET',
    url: '/api/encounters/00000000-0000-0000-0000-000000000063',
  })
  assert.equal(jeunesDay1.statusCode, 200)
  assert.deepEqual(jeunesDay1.json().matches, [])

  const unknown = await app.inject({
    method: 'GET',
    url: '/api/encounters/00000000-0000-0000-0000-000000000099',
  })
  assert.equal(unknown.statusCode, 404)

  const invalid = await app.inject({
    method: 'GET',
    url: '/api/encounters/not-an-id',
  })
  assert.equal(invalid.statusCode, 404)
})
