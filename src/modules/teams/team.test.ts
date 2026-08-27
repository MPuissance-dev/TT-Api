import assert from 'node:assert/strict'
import test from 'node:test'
import { parseTeamLabel } from './team.js'

test('the team rank inside the club is read from the label', () => {
  assert.deepEqual(parseTeamLabel('Mellinet TT 3'), {
    name: 'Mellinet TT 3',
    normalizedName: 'mellinet tt 3',
    number: 3,
  })
})

test('labels differing only by casing, accents or spacing share one identity', () => {
  assert.equal(
    parseTeamLabel('MELLINET  TT 3').normalizedName,
    parseTeamLabel('Mellinet TT 3').normalizedName
  )
  assert.equal(
    parseTeamLabel('Rezé TT 1').normalizedName,
    parseTeamLabel('REZE TT 1').normalizedName
  )
})

test('a label without a trailing number has no rank', () => {
  assert.deepEqual(parseTeamLabel('Mellinet TT'), {
    name: 'Mellinet TT',
    normalizedName: 'mellinet tt',
  })
})

test('an empty label is rejected', () => {
  assert.throws(() => parseTeamLabel('   '), /cannot be empty/)
})
