import { and, count, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { db, type Database } from '../../db/index.js'
import {
  divisions,
  encounters,
  pools,
  seasons,
} from '../../db/schemas/index.js'
import {
  seasonNameFromDate,
  type ChampionshipPhase,
} from '../seasons/season.js'
import type { DivisionCategory } from '../divisions/division.js'
import type { ChampionshipDayDateCount } from './calendar.js'

export interface EncounterSearchCriteria {
  dayNumber?: number | undefined
  /** Defaults to the season the current date belongs to, so seasons never get mixed up. */
  season?: string | undefined
  phase?: ChampionshipPhase | undefined
  /** Defaults to the senior championship, so youth and veteran ones never leak in. */
  category?: DivisionCategory | undefined
}

const encounterRelations = {
  pool: {
    with: { division: { with: { season: true } } },
  },
  homeTeam: {
    with: { club: true },
  },
  awayTeam: {
    with: { club: true },
  },
  lineup: {
    with: { player: true, team: true },
  },
} as const

export const buildSearchEncounters =
  (database: Database) =>
  async (criteria: EncounterSearchCriteria = {}) => {
    const season = criteria.season ?? seasonNameFromDate()
    const poolFilters = [
      eq(seasons.name, season),
      eq(divisions.category, criteria.category ?? 'senior'),
    ]
    if (criteria.phase !== undefined) {
      poolFilters.push(eq(divisions.phase, criteria.phase))
    }

    const poolsOfSeason = database
      .select({ id: pools.id })
      .from(pools)
      .innerJoin(divisions, eq(pools.divisionId, divisions.id))
      .innerJoin(seasons, eq(divisions.seasonId, seasons.id))
      .where(and(...poolFilters))

    const filters = [inArray(encounters.pool_id, poolsOfSeason)]
    if (criteria.dayNumber !== undefined) {
      filters.push(eq(encounters.championship_day_number, criteria.dayNumber))
    }

    return database.query.encounters.findMany({
      where: and(...filters),
      with: encounterRelations,
    })
  }

export type SearchEncounters = ReturnType<typeof buildSearchEncounters>

export const searchEncounters = buildSearchEncounters(db)

export type SearchEncounterRow = Awaited<
  ReturnType<typeof searchEncounters>
>[number]

export const buildFindEncounter =
  (database: Database) => async (encounterId: string) =>
    database.query.encounters.findFirst({
      where: eq(encounters.id, encounterId),
      with: {
        ...encounterRelations,
        matches: {
          orderBy: (matches, { asc }) => [asc(matches.number)],
          with: {
            homePlayer: true,
            homePlayer2: true,
            awayPlayer: true,
            awayPlayer2: true,
          },
        },
      },
    })

export type FindEncounter = ReturnType<typeof buildFindEncounter>

export const findEncounter = buildFindEncounter(db)

export type EncounterDetailsRow = NonNullable<
  Awaited<ReturnType<typeof findEncounter>>
>

export interface CalendarCriteria {
  season: string
  phase: ChampionshipPhase
  category: DivisionCategory
}

/** Only counts encounters per day and date: the calendar never needs their details. */
export const buildCountChampionshipDayDates =
  (database: Database) =>
  async (criteria: CalendarCriteria): Promise<ChampionshipDayDateCount[]> => {
    const date = sql<string>`to_char(${encounters.played_at}, 'YYYY-MM-DD')`
    const reported = sql<boolean>`${encounters.status} = 'reported'`

    const rows = await database
      .select({
        dayNumber: encounters.championship_day_number,
        date,
        reported,
        count: count(),
      })
      .from(encounters)
      .innerJoin(pools, eq(encounters.pool_id, pools.id))
      .innerJoin(divisions, eq(pools.divisionId, divisions.id))
      .innerJoin(seasons, eq(divisions.seasonId, seasons.id))
      .where(
        and(
          eq(seasons.name, criteria.season),
          eq(divisions.phase, criteria.phase),
          eq(divisions.category, criteria.category),
          isNotNull(encounters.championship_day_number)
        )
      )
      .groupBy(encounters.championship_day_number, date, reported)

    return rows.map((row) => ({ ...row, dayNumber: row.dayNumber as number }))
  }

export type CountChampionshipDayDates = ReturnType<
  typeof buildCountChampionshipDayDates
>

export const countChampionshipDayDates = buildCountChampionshipDayDates(db)
