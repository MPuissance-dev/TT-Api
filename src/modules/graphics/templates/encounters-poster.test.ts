import assert from 'node:assert/strict'
import test from 'node:test'
import { imageFormats } from '../formats.js'
import { fallbackFontStack } from '../fonts.js'
import type { PosterEncounter } from '../view-model.js'
import { escapeHtml, renderEncountersPoster } from './encounters-poster.js'

const noFonts = { css: '', fontFamily: fallbackFontStack }

const encounter = (
  overrides: Partial<PosterEncounter> = {}
): PosterEncounter => ({
  division: 'Départementale 1',
  pool: 'Poule A',
  season: '2024/2025',
  phase: 1,
  championshipDayNumber: 3,
  playedAt: '2025-01-18T18:00:00.000Z',
  status: 'PLAYED',
  homeScore: 12,
  awayScore: 8,
  homeTeam: {
    name: 'Mellinet 1',
    clubName: 'Stade Nantais',
    lineup: [{ fullName: 'Jean Dupont', points: 1200 }],
  },
  awayTeam: {
    name: 'Rezé 2',
    clubName: 'TT Rezé',
    lineup: [],
  },
  ...overrides,
})

const render = (encounters: PosterEncounter[], format = 'instagram-portrait') =>
  renderEncountersPoster({
    encounters,
    format: imageFormats[format as keyof typeof imageFormats],
    fonts: noFonts,
  })

test('special characters coming from the data are escaped', () => {
  assert.equal(
    escapeHtml('<b>"A" & \'B\'</b>'),
    '&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;'
  )
})

test('a team name containing markup cannot inject html', () => {
  const html = render([
    encounter({
      homeTeam: {
        name: '<script>alert(1)</script>',
        clubName: 'Club',
        lineup: [],
      },
    }),
  ])

  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;'))
})

test('the document is sized exactly like the requested format', () => {
  const html = render([encounter()], 'facebook-link')

  assert.ok(html.includes('width: 1200px'))
  assert.ok(html.includes('height: 630px'))
})

test('a played encounter shows the score, a scheduled one shows VS', () => {
  assert.ok(render([encounter()]).includes('12 - 8'))
  assert.ok(
    render([
      encounter({ status: 'SCHEDULED', homeScore: null, awayScore: null }),
    ]).includes('VS')
  )
})

test('the title and subtitle default to the first encounter', () => {
  const html = render([encounter()])

  assert.ok(html.includes('Journée 3'))
  assert.ok(html.includes('Saison 2024/2025 · Phase 1'))
})

test('encounters beyond the capacity of the format are summarised', () => {
  // facebook-link only shows 2 encounters.
  const html = render(
    [encounter(), encounter(), encounter(), encounter()],
    'facebook-link'
  )

  assert.ok(html.includes('+2 autres'))
})

test('an empty result renders a placeholder instead of an empty poster', () => {
  const html = render([])

  assert.ok(html.includes('Aucune rencontre à afficher'))
  assert.ok(html.includes('Rencontres'))
})

test('the followed club is flagged so the layout can emphasise it', () => {
  const html = renderEncountersPoster({
    encounters: [encounter()],
    format: imageFormats['instagram-portrait'],
    fonts: noFonts,
    highlightedClubName: 'Stade Nantais',
  })

  assert.ok(html.includes('class="team left highlight"'))
  assert.ok(!html.includes('class="team right highlight"'))
})
