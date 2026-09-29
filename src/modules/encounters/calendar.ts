export interface Weekend {
  /** Saturday, as YYYY-MM-DD. */
  start: string
  /** Sunday, as YYYY-MM-DD. */
  end: string
}

export interface CalendarDay {
  dayNumber: number
  weekend: Weekend
}

/** Number of encounters of a championship day played on a given date. */
export interface ChampionshipDayDateCount {
  dayNumber: number
  /** YYYY-MM-DD. */
  date: string
  reported: boolean
  count: number
}

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

/** Weekdays belong to the weekend closing their week, so a Friday evening encounter counts for the next day. */
export const weekendOf = (date: string): Weekend => {
  const day = new Date(`${date}T00:00:00.000Z`)
  const isoWeekday = day.getUTCDay() === 0 ? 7 : day.getUTCDay()

  const saturday = new Date(day)
  saturday.setUTCDate(day.getUTCDate() + 6 - isoWeekday)
  const sunday = new Date(saturday)
  sunday.setUTCDate(saturday.getUTCDate() + 1)

  return { start: isoDate(saturday), end: isoDate(sunday) }
}

/**
 * A championship day is held on the weekend most of its encounters are played,
 * so that brought forward or postponed encounters never move it. Reported
 * encounters are only relied on when nothing else is known about the day.
 */
export const buildCalendar = (
  counts: ChampionshipDayDateCount[]
): CalendarDay[] => {
  const countsByDay = new Map<number, ChampionshipDayDateCount[]>()
  for (const count of counts) {
    countsByDay.set(count.dayNumber, [
      ...(countsByDay.get(count.dayNumber) ?? []),
      count,
    ])
  }

  return [...countsByDay.entries()]
    .map(([dayNumber, dayCounts]) => {
      const confirmed = dayCounts.filter((count) => !count.reported)
      const relevant = confirmed.length > 0 ? confirmed : dayCounts

      const weekends = new Map<string, number>()
      for (const { date, count } of relevant) {
        const { start } = weekendOf(date)
        weekends.set(start, (weekends.get(start) ?? 0) + count)
      }

      const [start] = [...weekends.entries()].sort(
        ([startA, countA], [startB, countB]) =>
          countB - countA || startA.localeCompare(startB)
      )[0] as [string, number]

      return { dayNumber, weekend: weekendOf(start) }
    })
    .sort((a, b) => a.dayNumber - b.dayNumber)
}
