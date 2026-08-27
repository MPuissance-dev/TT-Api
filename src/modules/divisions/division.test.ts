import assert from 'node:assert/strict'
import test from 'node:test'
import { parseDivisionLabel } from './division.js'

test('the phase suffix is removed from the division name', () => {
  assert.deepEqual(parseDivisionLabel('Départementale 1 Phase 1'), {
    name: 'Départementale 1',
    level: 'Départementale',
    phase: 1,
  })
})

test('the level is extracted whatever the accents and the casing', () => {
  assert.equal(parseDivisionLabel('REGIONALE 2').level, 'Régionale')
  assert.equal(parseDivisionLabel('Pré-Nationale').level, 'Pré-Nationale')
  assert.equal(
    parseDivisionLabel('Pre Régionale Phase 2').level,
    'Pré-Régionale'
  )
  assert.equal(parseDivisionLabel('Nationale 3').level, 'Nationale')
})

test('an unrecognized label falls back to its own name as level', () => {
  assert.deepEqual(parseDivisionLabel('Coupe Davidson'), {
    name: 'Coupe Davidson',
    level: 'Coupe Davidson',
  })
})
