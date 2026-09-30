import { eq } from 'drizzle-orm'
import { db, type Database } from '../../db/index.js'
import { encounters } from '../../db/schemas/index.js'
import { defaultStartTimeOf } from '../divisions/schedule.js'
import { normalizeName } from '../../shared/text.js'
import {
  seasonNameFromDate,
  type ChampionshipPhase,
} from '../seasons/season.js'
import type { FfttClient } from './client.js'
import {
  createSynchronizationContext,
  type FfttSynchronizationLogger,
  type FfttSynchronizationSummary,
} from './sync/context.js'
import { collectDivisions, synchronizeDivision } from './sync/divisions.js'
import { synchronizeSingleEncounter } from './sync/encounters.js'
import { encounterExternalId } from './mappers.js'
import { upsertClub, upsertSeason } from './sync/repository.js'

export type {
  FfttSynchronizationLogger,
  FfttSynchronizationSummary,
} from './sync/context.js'

export interface FfttSynchronizationOptions {
  clubNumber: string
  verifyAccess?: boolean
  /** Season label such as `2025/2026`. Defaults to the season the current date belongs to. */
  season?: string
  /** Overrides the phase deduced from the FFTT division labels. */
  phase?: ChampionshipPhase
  /**
   * Downloads every result sheet and refreshes every club again. By default,
   * an encounter already complete in the database keeps its stored sheet.
   */
  force?: boolean
}

const assertAuthorized = async (client: FfttClient) => {
  const initialization = await client.initialize()
  if (!initialization.applicationAuthorized) {
    throw new Error(
      initialization.message ?? 'FFTT application is not authorized'
    )
  }
}

export const createFfttSynchronizer = (
  client: FfttClient,
  database: Database = db,
  logger: FfttSynchronizationLogger = (message, context) =>
    console.warn(message, context)
) => ({
  /**
   * Refreshes the whole championship picture of a club for one season: an
   * encounter already stored is updated in place, so a match that has just been
   * played sees its status, its score, its date and its lineup refreshed.
   */
  async synchronizeClub(
    options: FfttSynchronizationOptions
  ): Promise<FfttSynchronizationSummary> {
    if (!/^\d+$/.test(options.clubNumber)) {
      throw new Error('The FFTT club number must contain only digits')
    }

    const seasonName = options.season ?? seasonNameFromDate()
    logger('FFTT synchronization started', {
      clubNumber: options.clubNumber,
      season: seasonName,
    })

    if (options.verifyAccess === true) {
      await assertAuthorized(client)
    }

    const [sourceClub] = await client.searchClubs({
      number: options.clubNumber,
    })
    if (sourceClub === undefined) {
      throw new Error(`FFTT club not found: ${options.clubNumber}`)
    }

    const { seasonId, clubId } = await database.transaction(
      async (transaction) => ({
        seasonId: await upsertSeason(transaction, seasonName),
        clubId: await upsertClub(transaction, sourceClub),
      })
    )

    const context = createSynchronizationContext({
      client,
      database,
      log: logger,
      clubNumber: options.clubNumber,
      clubId,
      seasonId,
      seasonName,
      forcedPhase: options.phase,
      force: options.force,
    })

    await context.rosterOf(options.clubNumber)
    logger('FFTT club players synchronized', {
      count: context.synchronizedPlayerIds.size,
    })

    const sourceTeams = await client.listTeams(options.clubNumber)
    const divisions = collectDivisions(sourceTeams)
    logger('FFTT club loaded', {
      clubNumber: options.clubNumber,
      teamCount: sourceTeams.length,
      divisionCount: divisions.length,
    })

    for (const division of divisions) {
      await synchronizeDivision(context, division)
    }

    const summary = context.summary
    summary.teams = context.synchronizedTeamIds.size
    summary.players = context.synchronizedPlayerIds.size
    summary.lineups = context.synchronizedLineupKeys.size

    logger('FFTT club synchronization completed', { ...summary })
    return summary
  },

  /**
   * Downloads the result sheet of a single stored encounter again, to pick up
   * a correction without synchronizing the whole club. Resolves to `undefined`
   * when the encounter is unknown.
   */
  async synchronizeEncounter(
    encounterId: string
  ): Promise<FfttSynchronizationSummary | undefined> {
    const stored = await database.query.encounters.findFirst({
      where: eq(encounters.id, encounterId),
      with: {
        pool: { with: { division: { with: { season: true } } } },
        homeTeam: { with: { club: true } },
        awayTeam: { with: { club: true } },
      },
    })
    if (stored === undefined) {
      return undefined
    }

    const { pool, homeTeam, awayTeam } = stored
    const division = pool.division
    if (pool.ffttId === null || division.ffttId === null) {
      throw new Error('This encounter was not synchronized from the FFTT')
    }

    const sourceEncounters = await client.listPoolEncounters(
      division.ffttId,
      pool.ffttId
    )
    const sameTeam = (label: string, name: string) =>
      normalizeName(label) === normalizeName(name)
    const source =
      sourceEncounters.find(
        (encounter) =>
          stored.ffttId !== null &&
          encounterExternalId(encounter, pool.ffttId as string) ===
            stored.ffttId
      ) ??
      sourceEncounters.find(
        (encounter) =>
          sameTeam(encounter.homeTeamLabel, homeTeam.name) &&
          sameTeam(encounter.awayTeamLabel, awayTeam.name)
      )
    if (source === undefined) {
      throw new Error(`FFTT encounter not found: ${encounterId}`)
    }

    const context = createSynchronizationContext({
      client,
      database,
      log: logger,
      clubNumber: homeTeam.club.numero,
      clubId: homeTeam.clubId,
      seasonId: division.seasonId,
      seasonName: division.season.name,
      forcedPhase: undefined,
    })

    logger('FFTT encounter synchronization started', {
      encounterId,
      encounter: source.label,
    })

    await synchronizeSingleEncounter(
      context,
      {
        divisionExternalId: division.ffttId,
        poolExternalId: pool.ffttId,
        localPoolId: pool.id,
        defaultStartTime: defaultStartTimeOf(division.level, division.category),
      },
      source,
      {
        label: 'home',
        teamId: homeTeam.id,
        clubNumber: homeTeam.club.numero,
      },
      {
        label: 'away',
        teamId: awayTeam.id,
        clubNumber: awayTeam.club.numero,
      }
    )

    const summary = context.summary
    // The home club only seeds the context, it is not refreshed here.
    summary.clubs -= 1
    summary.players = context.synchronizedPlayerIds.size
    summary.lineups = context.synchronizedLineupKeys.size

    logger('FFTT encounter synchronization completed', { ...summary })
    return summary
  },
})

export type FfttSynchronizer = ReturnType<typeof createFfttSynchronizer>
