import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { imageFormatNames, imageFormats } from './formats.js'
import { renderEncountersPoster } from './templates/encounters-poster.js'
import type { PosterEncounter } from './view-model.js'

/**
 * Deliberately unreasonable data: the layout clamps every text line so a card
 * keeps a constant height, and the capacity of a format must hold even then.
 */
const overflowingEncounter = (index: number): PosterEncounter => ({
  division: 'Championnat Départemental Première Division',
  pool: 'Poule A',
  season: '2025/2026',
  phase: 2,
  championshipDayNumber: 1,
  playedAt: '2026-01-10T18:00:00.000Z',
  status: 'PLAYED',
  homeScore: 14,
  awayScore: 6,
  homeTeam: {
    name: `Association Sportive et Culturelle de Saint-Herblain ${String(index)}`,
    clubName: 'Association Sportive et Culturelle de Saint-Herblain',
    lineup: Array.from({ length: 8 }, (_, player) => ({
      fullName: `Jean-Baptiste de La Rochefoucauld ${String(player)}`,
      points: 1287,
    })),
  },
  awayTeam: {
    name: `Union Sportive Municipale de Rezé ${String(index)}`,
    clubName: 'Union Sportive Municipale de Rezé',
    lineup: Array.from({ length: 8 }, (_, player) => ({
      fullName: `Marie-Charlotte Vandenbergh ${String(player)}`,
      points: 998,
    })),
  },
})

/** Height the stack of cards really needs, versus the room it is given. */
const measureCardStack = () => {
  const container = document.querySelector('.cards')
  if (container === null) {
    return { needed: 0, available: 0 }
  }

  const cards = [...container.querySelectorAll('.card')]
  const rowGap = Number.parseFloat(getComputedStyle(container).rowGap)
  const gaps =
    (Number.isNaN(rowGap) ? 0 : rowGap) * Math.max(cards.length - 1, 0)
  const needed = cards.reduce(
    (total, card) => total + (card as HTMLElement).offsetHeight,
    gaps
  )

  return { needed: Math.round(needed), available: container.clientHeight }
}

test('no format overflows when filled to capacity with oversized data', async () => {
  const browser = await chromium.launch()

  try {
    for (const name of imageFormatNames) {
      const format = imageFormats[name]
      const html = renderEncountersPoster({
        encounters: Array.from({ length: format.maxEncounters }, (_, index) =>
          overflowingEncounter(index + 1)
        ),
        format,
        highlightedClubName:
          'Association Sportive et Culturelle de Saint-Herblain',
      })

      const context = await browser.newContext({
        viewport: { width: format.width, height: format.height },
        locale: 'fr-FR',
        timezoneId: 'Europe/Paris',
      })

      try {
        const page = await context.newPage()
        await page.setContent(html, { waitUntil: 'load' })
        await page.evaluate(() => document.fonts.ready)

        const { needed, available } = await page.evaluate(measureCardStack)

        assert.ok(
          needed <= available,
          `${name} needs ${String(needed)}px for ${String(format.maxEncounters)} encounters but only has ${String(available)}px`
        )
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }
})
