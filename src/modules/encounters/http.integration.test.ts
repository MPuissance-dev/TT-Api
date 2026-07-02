import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from '../../server.js'
import { buildExpectedEncounterResponse } from '../../db/fixtures/demo-data.js'

const databaseUrl = process.env.DATABASE_URL

if (databaseUrl === undefined) {
  throw new Error('DATABASE_URL is required to run HTTP integration tests against PostgreSQL')
}

const testConfig = {
  PORT: '0',
  DATABASE_URL: databaseUrl,
}

test('POST /api/encounters/encounters-search returns JSON consistent with PostgreSQL data', async (t) => {
  const app = await createServer({
    logger: false,
    config: testConfig,
  })

  t.after(async () => {
    await app.close()
  })

  const response = await app.inject({
    method: 'POST',
    url: '/api/encounters/encounters-search',
    payload: { dayNumber: 1 },
  })

  assert.equal(response.statusCode, 200)

  const expected = buildExpectedEncounterResponse(1)
  const actual = response.json().sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))

  assert.deepEqual(actual, expected)
})
