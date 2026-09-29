import type { DivisionCategory } from './division.js'

export interface StartTime {
  readonly hours: number
  readonly minutes: number
}

/**
 * The FFTT only publishes the day of an encounter, never its time. Senior
 * championship encounters start at a fixed time per level, so it is filled in
 * from this table. A level missing here keeps an unknown time (midnight).
 */
export const seniorStartTimes: Readonly<Record<string, StartTime>> = {
  'Pré-Nationale': { hours: 17, minutes: 0 },
  Régionale: { hours: 14, minutes: 30 },
  // Played alongside the departmental divisions.
  'Pré-Régionale': { hours: 8, minutes: 30 },
  Départementale: { hours: 8, minutes: 30 },
}

export const defaultStartTimeOf = (
  level: string,
  category: DivisionCategory
): StartTime | undefined =>
  category === 'senior' ? seniorStartTimes[level] : undefined

/**
 * Dates are Paris wall-clock times stored on the UTC calendar, so midnight UTC
 * means the FFTT gave no time at all: an actual time is never overwritten.
 */
export const hasKnownTime = (date: Date): boolean =>
  date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0

export const withDefaultStartTime = (
  date: Date,
  startTime: StartTime | undefined
): Date => {
  if (startTime === undefined || hasKnownTime(date)) {
    return date
  }

  const scheduled = new Date(date)
  scheduled.setUTCHours(startTime.hours, startTime.minutes, 0, 0)
  return scheduled
}
