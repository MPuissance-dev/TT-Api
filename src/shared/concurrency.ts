/**
 * Runs an asynchronous operation over every item while never exceeding the
 * given number of simultaneous operations, and keeps the input order.
 */
export const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  operation: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  if (items.length === 0) {
    return []
  }

  const results = Array.from<R>({ length: items.length })
  let next = 0

  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next
      next += 1
      const item = items[index] as T
      results[index] = await operation(item, index)
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    () => worker()
  )
  await Promise.all(workers)

  return results as R[]
}

/**
 * Wraps an operation so that at most `limit` calls are in flight at any time.
 * Used to keep a fragile remote API from being flooded.
 */
export const createConcurrencyLimiter = (limit: number) => {
  const pending: (() => void)[] = []
  let running = 0

  const release = () => {
    running -= 1
    const next = pending.shift()
    if (next !== undefined) {
      next()
    }
  }

  return async <T>(operation: () => Promise<T>): Promise<T> => {
    if (running >= limit) {
      await new Promise<void>((resolve) => pending.push(resolve))
    }

    running += 1
    try {
      return await operation()
    } finally {
      release()
    }
  }
}

const defaultSleep = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs))

/**
 * Spaces out departures so a remote service never sees a burst, and can be told
 * to hold everything back when it answers that it is being called too often.
 */
export interface Pacer {
  /** Resolves once another call is allowed to leave. */
  acquire(): Promise<void>
  /** Holds every subsequent call back for at least the given delay. */
  pause(delayMs: number): void
}

export interface PacerOptions {
  now?: () => number
  sleep?: (delayMs: number) => Promise<void>
}

export const createPacer = (
  minIntervalMs: number,
  options: PacerOptions = {}
): Pacer => {
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? defaultSleep

  let nextAllowedAt = 0
  // Incremented by every pause, so a call already waiting knows the deadline it
  // read has moved and must be read again.
  let pauseCount = 0
  // Callers are queued one behind the other, otherwise they would all read the
  // same free slot at once and leave together.
  let queue: Promise<void> = Promise.resolve()

  const gate = async (): Promise<void> => {
    for (let seen = -1; seen !== pauseCount;) {
      seen = pauseCount
      const waitMs = nextAllowedAt - now()
      if (waitMs > 0) {
        await sleep(waitMs)
      }
    }

    // The deadline, not the clock, carries the pace: a caller that was let
    // through early still pushes the next one back by a full interval.
    nextAllowedAt = Math.max(nextAllowedAt, now()) + minIntervalMs
  }

  return {
    acquire() {
      const departure = queue.then(gate)
      // A failed departure must not poison the queue for the calls behind it.
      queue = departure.catch(() => undefined)
      return departure
    },

    pause(delayMs) {
      nextAllowedAt = Math.max(nextAllowedAt, now() + delayMs)
      pauseCount += 1
    },
  }
}
