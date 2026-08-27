import { db, type Database } from '../../db/index.js'
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
})

export type FfttSynchronizer = ReturnType<typeof createFfttSynchronizer>
