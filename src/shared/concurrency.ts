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
