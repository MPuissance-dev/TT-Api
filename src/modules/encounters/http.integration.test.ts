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

const followedClubNumber = 'P001'

const testConfig = {
  PORT: '0',
  DATABASE_URL: databaseUrl,
  FFTT_CLUB_NUMBER: followedClubNumber,
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

  const expected = buildExpectedEncounterResponse(1, followedClubNumber)
  const actual = response
    .json()
    .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))

  assert.deepEqual(actual, expected)
})
