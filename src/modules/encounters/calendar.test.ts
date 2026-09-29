import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCalendar, weekendOf } from './calendar.js'

test('every day of a week belongs to the weekend closing it', () => {
  const weekend = { start: '2025-09-20', end: '2025-09-21' }

  assert.deepEqual(weekendOf('2025-09-15'), weekend)
  assert.deepEqual(weekendOf('2025-09-19'), weekend)
  assert.deepEqual(weekendOf('2025-09-20'), weekend)
  assert.deepEqual(weekendOf('2025-09-21'), weekend)
})

test('the weekend of a day is the one most of its encounters are played', () => {
  assert.deepEqual(
    buildCalendar([
      { dayNumber: 2, date: '2025-10-04', reported: false, count: 5 },
      { dayNumber: 1, date: '2025-09-20', reported: false, count: 3 },
      { dayNumber: 1, date: '2025-09-21', reported: false, count: 4 },
      { dayNumber: 1, date: '2025-09-27', reported: false, count: 2 },
    ]),
    [
      { dayNumber: 1, weekend: { start: '2025-09-20', end: '2025-09-21' } },
      { dayNumber: 2, weekend: { start: '2025-10-04', end: '2025-10-05' } },
    ]
  )
})

test('reported encounters never move a day', () => {
  assert.deepEqual(
    buildCalendar([
      { dayNumber: 1, date: '2025-09-20', reported: false, count: 1 },
      { dayNumber: 1, date: '2025-11-15', reported: true, count: 6 },
    ]),
    [{ dayNumber: 1, weekend: { start: '2025-09-20', end: '2025-09-21' } }]
  )
})

test('a day only made of reported encounters is still listed', () => {
  assert.deepEqual(
    buildCalendar([
      { dayNumber: 1, date: '2025-11-15', reported: true, count: 2 },
    ]),
    [{ dayNumber: 1, weekend: { start: '2025-11-15', end: '2025-11-16' } }]
  )
})

test('a tie goes to the earliest weekend', () => {
  assert.deepEqual(
    buildCalendar([
      { dayNumber: 1, date: '2026-01-17', reported: false, count: 1 },
      { dayNumber: 1, date: '2026-01-10', reported: false, count: 1 },
    ]),
    [{ dayNumber: 1, weekend: { start: '2026-01-10', end: '2026-01-11' } }]
  )
})
