import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compareDivisions,
  divisionCategoryOf,
  divisionNumberOf,
  parseDivisionLabel,
} from './division.js'

test('the phase suffix is removed from the division name', () => {
  assert.deepEqual(parseDivisionLabel('Départementale 1 Phase 1'), {
    name: 'Départementale 1',
    level: 'Départementale',
    echelon: 'departmental',
    phase: 1,
  })
})

test('the FFTT abbreviated labels are recognized', () => {
  const cases: [string, string, string][] = [
    ['L12 PH1 Reg. 1 Messieurs Poule 2', 'Régionale', 'regional'],
    ['L12 PH1 REG. 3 MESSIEURS Poule 2', 'Régionale', 'regional'],
    ['L12 PH1 PRENAT MESSIEURS Poule 1', 'Pré-Nationale', 'regional'],
    ['D44 PR SENIORS MESSIEURS PH1 Poule 3', 'Pré-Régionale', 'departmental'],
    ['D44 D1 SENIORS MESSIEURS PH1 Poule 2', 'Départementale', 'departmental'],
  ]

  for (const [label, level, echelon] of cases) {
    const parsed = parseDivisionLabel(label)
    assert.equal(parsed.level, level, label)
    assert.equal(parsed.echelon, echelon, label)
    assert.equal(parsed.phase, 1, label)
  }
})

test('the organizer tells the echelon when the wording names no level', () => {
  assert.deepEqual(parseDivisionLabel('D44 SENIORS MESSIEURS'), {
    name: 'D44 SENIORS MESSIEURS',
    level: 'Départementale',
    echelon: 'departmental',
  })
  assert.equal(parseDivisionLabel('FED_Nationale 2').echelon, 'national')
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

test('divisions are ordered from the highest level down', () => {
  const labels = [
    'Départementale 2',
    'Pré-Régionale',
    'REGIONALE 2',
    'D44 SENIORS MESSIEURS',
    'Coupe Davidson',
    'Pré-Nationale',
    'R1',
    'Départementale 1',
    'Nationale 3',
  ]

  const ordered = labels
    .map((label) => parseDivisionLabel(label))
    .sort(compareDivisions)
    .map((division) => division.name)

  assert.deepEqual(ordered, [
    'Nationale 3',
    'Pré-Nationale',
    'R1',
    'REGIONALE 2',
    'Pré-Régionale',
    'Départementale 1',
    'Départementale 2',
    'D44 SENIORS MESSIEURS',
    'Coupe Davidson',
  ])
})

test('the division number ignores the organizer code', () => {
  assert.equal(divisionNumberOf('Régionale 2'), 2)
  assert.equal(divisionNumberOf('R3'), 3)
  assert.equal(divisionNumberOf('D44 SENIORS MESSIEURS'), undefined)
  assert.equal(divisionNumberOf('D44 Départementale 1'), 1)
  assert.equal(divisionNumberOf('Pré-Nationale'), undefined)
})
