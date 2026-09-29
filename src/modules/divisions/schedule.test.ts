import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultStartTimeOf,
  hasKnownTime,
  withDefaultStartTime,
} from './schedule.js'

const day = new Date('2026-01-11T00:00:00.000Z')

test('each senior level has its own start time', () => {
  assert.deepEqual(defaultStartTimeOf('Pré-Nationale', 'senior'), {
    hours: 17,
    minutes: 0,
  })
  assert.deepEqual(defaultStartTimeOf('Régionale', 'senior'), {
    hours: 14,
    minutes: 30,
  })
  assert.deepEqual(defaultStartTimeOf('Départementale', 'senior'), {
    hours: 8,
    minutes: 30,
  })
  assert.deepEqual(defaultStartTimeOf('Pré-Régionale', 'senior'), {
    hours: 8,
    minutes: 30,
  })
})

test('levels and categories without a rule have no start time', () => {
  assert.equal(defaultStartTimeOf('Nationale', 'senior'), undefined)
  assert.equal(defaultStartTimeOf('Départementale', 'youth'), undefined)
})

test('the start time is applied to a day without time', () => {
  const scheduled = withDefaultStartTime(
    day,
    defaultStartTimeOf('Régionale', 'senior')
  )

  assert.equal(scheduled.toISOString(), '2026-01-11T14:30:00.000Z')
  assert.equal(day.toISOString(), '2026-01-11T00:00:00.000Z')
})

test('a time published by the FFTT is never overwritten', () => {
  const published = new Date('2026-01-11T10:00:00.000Z')

  assert.equal(
    withDefaultStartTime(published, { hours: 14, minutes: 30 }),
    published
  )
})

test('a day without a start time stays at midnight, meaning unknown', () => {
  const unscheduled = withDefaultStartTime(day, undefined)

  assert.equal(hasKnownTime(unscheduled), false)
})
