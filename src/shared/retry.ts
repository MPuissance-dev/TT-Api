export interface RetryOptions {
  /** Total number of attempts, the first one included. */
  attempts: number
  /** Base delay, doubled after every failed attempt. */
  baseDelayMs: number
  /** Decides whether a failure is worth another attempt. */
  isRetryable: (error: unknown) => boolean
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
  sleep?: (delayMs: number) => Promise<void>
}

const defaultSleep = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs))

/**
 * Runs an operation again after a transient failure, waiting twice as long
 * between each attempt so a struggling remote service is not hammered.
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> => {
  const sleep = options.sleep ?? defaultSleep
  let lastError: unknown

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt === options.attempts || !options.isRetryable(error)) {
        throw error
      }

      const delayMs = options.baseDelayMs * 2 ** (attempt - 1)
      options.onRetry?.(error, attempt, delayMs)
      await sleep(delayMs)
    }
  }

  throw lastError
}
