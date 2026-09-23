import { chromium, type Browser, type LaunchOptions } from 'playwright'
import type { ImageFormat } from './formats.js'

export interface PosterRenderer {
  /** Rasterises a standalone HTML document at the exact size of the format. */
  toPng: (html: string, format: ImageFormat) => Promise<Buffer>
  /** Releases the shared browser. Safe to call when nothing was launched. */
  close: () => Promise<void>
}

export interface PosterRendererOptions {
  /**
   * Extra Chromium flags. `--no-sandbox` is usually required when running as
   * root inside a container.
   */
  readonly launchOptions?: LaunchOptions | undefined
}

const defaultLaunchArgs = [
  // Makes glyph rasterisation identical across machines.
  '--font-render-hinting=none',
  '--disable-lcd-text',
]

/**
 * Creates a renderer backed by a single long lived browser. Launching Chromium
 * costs hundreds of milliseconds, so the instance is reused across requests and
 * only the page is per-render.
 */
export const createPosterRenderer = (
  options: PosterRendererOptions = {}
): PosterRenderer => {
  // The promise itself is memoised so concurrent renders share one launch.
  let browserPromise: Promise<Browser> | undefined

  const browser = async (): Promise<Browser> => {
    browserPromise ??= chromium.launch({
      ...options.launchOptions,
      args: [...defaultLaunchArgs, ...(options.launchOptions?.args ?? [])],
    })
    return browserPromise
  }

  return {
    toPng: async (html, format) => {
      const instance = await browser()
      const context = await instance.newContext({
        viewport: { width: format.width, height: format.height },
        deviceScaleFactor: 1,
        // Locale and timezone drive the dates already formatted in the HTML,
        // but they also affect fallback font selection.
        locale: 'fr-FR',
        timezoneId: 'Europe/Paris',
      })

      try {
        const page = await context.newPage()
        await page.setContent(html, { waitUntil: 'load' })
        // Embedded fonts load asynchronously; screenshotting too early would
        // capture the fallback typeface.
        await page.evaluate(() => document.fonts.ready)
        return await page.screenshot({ type: 'png' })
      } finally {
        await context.close()
      }
    },

    close: async () => {
      const pending = browserPromise
      browserPromise = undefined
      if (pending !== undefined) {
        await (await pending).close()
      }
    },
  }
}
