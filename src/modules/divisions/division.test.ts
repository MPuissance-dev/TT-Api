import assert from 'node:assert/strict'
import test from 'node:test'
import { divisionCategoryOf, parseDivisionLabel } from './division.js'

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

test('a championship without any age wording is a senior one', () => {
  assert.equal(
    divisionCategoryOf(
      'Championnat par Equipes Masculin',
      'Départementale 1 Phase 1'
    ),
    'senior'
  )
  assert.equal(divisionCategoryOf(undefined, 'Régionale 2'), 'senior')
})

test('the youth championships are recognized whatever their wording', () => {
  assert.equal(divisionCategoryOf('Championnat Jeunes'), 'youth')
  assert.equal(divisionCategoryOf(undefined, 'Départementale Cadets'), 'youth')
  assert.equal(divisionCategoryOf('Critérium Minimes'), 'youth')
  assert.equal(divisionCategoryOf('Championnat moins de 13 ans'), 'youth')
})

test('the veteran championships are recognized whatever their wording', () => {
  assert.equal(divisionCategoryOf('Championnat Vétérans'), 'veteran')
  assert.equal(divisionCategoryOf(undefined, 'Vétérans D1'), 'veteran')
})
