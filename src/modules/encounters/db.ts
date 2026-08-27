import { and, eq, inArray } from 'drizzle-orm'
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

export interface EncounterSearchCriteria {
  dayNumber?: number | undefined
  /** Defaults to the season the current date belongs to, so seasons never get mixed up. */
  season?: string | undefined
  phase?: ChampionshipPhase | undefined
}

export const buildSearchEncounters =
  (database: Database) =>
  async (criteria: EncounterSearchCriteria = {}) => {
    const season = criteria.season ?? seasonNameFromDate()
    const poolFilters = [eq(seasons.name, season)]
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
      with: {
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
      },
    })
  }

export type SearchEncounters = ReturnType<typeof buildSearchEncounters>

export const searchEncounters = buildSearchEncounters(db)

export type SearchEncounterRow = Awaited<
  ReturnType<typeof searchEncounters>
>[number]
