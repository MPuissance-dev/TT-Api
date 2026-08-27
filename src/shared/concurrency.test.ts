import assert from 'node:assert/strict'
import test from 'node:test'
import { createConcurrencyLimiter, mapWithConcurrency } from './concurrency.js'

const deferred = () => {
  let resolve: () => void = () => {}
  const promise = new Promise<void>((settle) => {
    resolve = settle
  })

  return { promise, resolve }
}

test('the results keep the order of the input', async () => {
  const results = await mapWithConcurrency(
    [1, 2, 3, 4, 5],
    2,
    async (value) => {
      await new Promise((resolve) => setTimeout(resolve, (5 - value) * 2))
      return value * 10
    }
  )

  assert.deepEqual(results, [10, 20, 30, 40, 50])
})

test('no more operations than the limit run at the same time', async () => {
  let running = 0
  let peak = 0

  await mapWithConcurrency(
    Array.from({ length: 10 }, (_, index) => index),
    3,
    async () => {
      running += 1
      peak = Math.max(peak, running)
      await new Promise((resolve) => setTimeout(resolve, 5))
      running -= 1
    }
  )

  assert.equal(peak, 3)
})

test('an empty input runs nothing', async () => {
  let calls = 0

  const results = await mapWithConcurrency([], 4, async () => {
    calls += 1
  })

  assert.deepEqual(results, [])
  assert.equal(calls, 0)
})

test('the limiter holds back a call until a slot frees up', async () => {
  const limit = createConcurrencyLimiter(1)
  const first = deferred()
  let secondStarted = false

  const firstCall = limit(() => first.promise)
  const secondCall = limit(async () => {
    secondStarted = true
  })

  await Promise.resolve()
  assert.equal(secondStarted, false, 'the slot is still taken')

  first.resolve()
  await Promise.all([firstCall, secondCall])
  assert.equal(secondStarted, true)
})

test('a failing call frees its slot', async () => {
  const limit = createConcurrencyLimiter(1)

  await assert.rejects(() =>
    limit(async () => {
      throw new Error('boom')
    })
  )

  assert.equal(await limit(async () => 'ok'), 'ok')
})
