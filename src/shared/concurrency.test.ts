import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createConcurrencyLimiter,
  createPacer,
  mapWithConcurrency,
} from './concurrency.js'

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

test('calls are spaced by the requested interval', async () => {
  const waits: number[] = []
  let clock = 0
  const pacer = createPacer(100, {
    now: () => clock,
    sleep: async (delayMs) => {
      waits.push(delayMs)
      clock += delayMs
    },
  })

  await pacer.acquire()
  await pacer.acquire()
  await pacer.acquire()

  assert.deepEqual(waits, [100, 100], 'the first call leaves immediately')
})

test('a pause holds back the calls already waiting', async () => {
  const waits: number[] = []
  let clock = 0
  const pacer = createPacer(10, {
    now: () => clock,
    sleep: async (delayMs) => {
      waits.push(delayMs)
      clock += delayMs
      if (waits.length === 1) {
        pacer.pause(500)
      }
    },
  })

  await pacer.acquire()
  await pacer.acquire()

  assert.deepEqual(
    waits,
    [10, 500],
    'the deadline is read again after the pause'
  )
})

test('an instant sleep does not turn the pacer into a busy loop', async () => {
  let naps = 0
  const pacer = createPacer(1_000, {
    sleep: async () => {
      naps += 1
    },
  })

  await pacer.acquire()
  await pacer.acquire()

  assert.equal(naps, 1)
})
