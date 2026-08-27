import assert from 'node:assert/strict'
import test from 'node:test'
import {
  phaseFromDate,
  phaseFromLabel,
  seasonNameFromDate,
  seasonStartYear,
} from './season.js'

test('a season starts in July and spans two calendar years', () => {
  assert.equal(
    seasonNameFromDate(new Date('2025-09-13T00:00:00Z')),
    '2025/2026'
  )
  assert.equal(
    seasonNameFromDate(new Date('2025-07-01T00:00:00Z')),
    '2025/2026'
  )
  assert.equal(
    seasonNameFromDate(new Date('2026-05-24T00:00:00Z')),
    '2025/2026'
  )
  assert.equal(
    seasonNameFromDate(new Date('2026-06-30T00:00:00Z')),
    '2025/2026'
  )
  assert.equal(
    seasonNameFromDate(new Date('2026-07-01T00:00:00Z')),
    '2026/2027'
  )
})

test('seasonStartYear rejects malformed labels', () => {
  assert.equal(seasonStartYear('2025/2026'), 2025)
  assert.throws(
    () => seasonStartYear('2025-2026'),
    /Expected the 2025\/2026 format/
  )
  assert.throws(() => seasonStartYear('2025/2027'), /two consecutive years/)
})

test('the phase is deduced from the date when the label says nothing', () => {
  assert.equal(phaseFromDate(new Date('2025-10-11T00:00:00Z')), 1)
  assert.equal(phaseFromDate(new Date('2026-02-07T00:00:00Z')), 2)
})

test('the phase is read from the division label when present', () => {
  assert.equal(phaseFromLabel('Départementale 1 Phase 2'), 2)
  assert.equal(phaseFromLabel('DEPARTEMENTALE 1 phase1'), 1)
  assert.equal(phaseFromLabel('Régionale 3'), undefined)
})
