import assert from 'node:assert/strict'
import test from 'node:test'
import { withRetry } from './retry.js'

const alwaysRetryable = () => true

test('an operation that succeeds is not attempted twice', async () => {
  let attempts = 0

  const result = await withRetry(
    async () => {
      attempts += 1
      return 'ok'
    },
    { attempts: 3, baseDelayMs: 1, isRetryable: alwaysRetryable }
  )

  assert.equal(result, 'ok')
  assert.equal(attempts, 1)
})

test('a transient failure is retried until it succeeds', async () => {
  let attempts = 0

  const result = await withRetry(
    async () => {
      attempts += 1
      if (attempts < 3) {
        throw new Error('temporary')
      }

      return attempts
    },
    {
      attempts: 3,
      baseDelayMs: 1,
      isRetryable: alwaysRetryable,
      sleep: async () => {},
    }
  )

  assert.equal(result, 3)
})

test('the delay doubles after every failed attempt', async () => {
  const delays: number[] = []

  await assert.rejects(() =>
    withRetry(
      async () => {
        throw new Error('down')
      },
      {
        attempts: 4,
        baseDelayMs: 100,
        isRetryable: alwaysRetryable,
        sleep: async (delayMs) => {
          delays.push(delayMs)
        },
      }
    )
  )

  assert.deepEqual(delays, [100, 200, 400])
})

test('a permanent failure is raised without being retried', async () => {
  let attempts = 0

  await assert.rejects(
    () =>
      withRetry(
        async () => {
          attempts += 1
          throw new Error('unauthorized')
        },
        {
          attempts: 5,
          baseDelayMs: 1,
          isRetryable: () => false,
          sleep: async () => {},
        }
      ),
    /unauthorized/
  )

  assert.equal(attempts, 1)
})
