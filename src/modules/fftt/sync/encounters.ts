import { mapWithConcurrency } from '../../../shared/concurrency.js'
import { normalizeName } from '../../../shared/text.js'
import { linkParameter } from '../client.js'
import {
  encounterExternalId,
  getEncounterStatus,
  parseFfttDate,
} from '../mappers.js'
import {
  withDefaultStartTime,
  type StartTime,
} from '../../divisions/schedule.js'
import type { FfttEncounter } from '../models.js'
import type { SynchronizationContext } from './context.js'
import { resolveEncounterSheet, type ResolvedSheet } from './sheet.js'
import {
  findEncounterStates,
  replaceEncounterLineup,
  replaceEncounterMatches,
  upsertEncounter,
  type StoredEncounterState,
} from './repository.js'

export interface PoolLocation {
  divisionExternalId: string
  poolExternalId: string
  localPoolId: string
  /** Applied when the FFTT publishes the day of an encounter without its time. */
  defaultStartTime?: StartTime | undefined
}

export interface EncounterSide {
  label: 'home' | 'away'
  teamId: string
  clubNumber: string | undefined
}

/** Number of result sheets downloaded at the same time inside a pool. */
const resultSheetConcurrency = 4

export const synchronizeEncounters = async (
  context: SynchronizationContext,
  pool: PoolLocation
): Promise<void> => {
  const sourceEncounters = await context.client.listPoolEncounters(
    pool.divisionExternalId,
    pool.poolExternalId
  )

  const stored = context.force
    ? new Map<string, StoredEncounterState>()
    : await findEncounterStates(context.database, pool.localPoolId)

  // Everything that needs the FFTT is prepared first, several encounters at a
  // time; the writes then happen one by one so no two transactions compete.
  const prepared = await mapWithConcurrency(
    sourceEncounters,
    resultSheetConcurrency,
    (encounter) =>
      prepareEncounter(
        context,
        pool,
        encounter,
        stored.get(encounterExternalId(encounter, pool.poolExternalId))
      )
  )

  for (const encounter of prepared) {
    if (encounter === undefined) {
      continue
    }

    await persistEncounter(context, pool, encounter)
  }
}

interface PreparedEncounter {
  source: FfttEncounter
  home: EncounterSide
  away: EncounterSide
  playedAt: Date
  sheet: ResolvedSheet
}

/** Left untouched when written: whatever is stored for the encounter is kept. */
const keptSheet: ResolvedSheet = { lineup: undefined, games: undefined }

/**
 * A result sheet is final once published: an encounter already stored as
 * played, with the same score and its games recorded, has nothing new to read.
 */
const isAlreadyComplete = (
  stored: StoredEncounterState | undefined,
  encounter: FfttEncounter
): boolean =>
  stored !== undefined &&
  stored.status === 'played' &&
  stored.matchCount > 0 &&
  getEncounterStatus(encounter) === 'played' &&
  stored.homeScore === (encounter.homeScore ?? null) &&
  stored.awayScore === (encounter.awayScore ?? null)

const prepareEncounter = async (
  context: SynchronizationContext,
  pool: PoolLocation,
  encounter: FfttEncounter,
  stored: StoredEncounterState | undefined
): Promise<PreparedEncounter | undefined> => {
  const sides = resolveSides(context, pool.localPoolId, encounter)

  if (
    sides.home.clubNumber !== context.clubNumber &&
    sides.away.clubNumber !== context.clubNumber
  ) {
    return undefined
  }

  const homeTeamId = sides.home.teamId
  const awayTeamId = sides.away.teamId
  if (homeTeamId === undefined || awayTeamId === undefined) {
    context.summary.skippedEncounters += 1
    context.summary.skippedEncounterReasons.missingTeams += 1
    context.log('FFTT encounter skipped, unknown team', {
      encounter: encounter.label,
      homeTeamLabel: encounter.homeTeamLabel,
      awayTeamLabel: encounter.awayTeamLabel,
    })
    return undefined
  }

  return prepareEncounterOfSides(
    context,
    pool,
    encounter,
    { label: 'home', teamId: homeTeamId, clubNumber: sides.home.clubNumber },
    { label: 'away', teamId: awayTeamId, clubNumber: sides.away.clubNumber },
    stored
  )
}

const prepareEncounterOfSides = async (
  context: SynchronizationContext,
  pool: PoolLocation,
  encounter: FfttEncounter,
  home: EncounterSide,
  away: EncounterSide,
  stored: StoredEncounterState | undefined
): Promise<PreparedEncounter | undefined> => {
  const publishedAt = parseFfttDate(
    encounter.actualDate ?? encounter.plannedDate
  )
  if (publishedAt === undefined) {
    context.summary.skippedEncounters += 1
    context.summary.skippedEncounterReasons.missingDate += 1
    context.log('FFTT encounter skipped, unusable date', {
      encounter: encounter.label,
      plannedDate: encounter.plannedDate,
      actualDate: encounter.actualDate,
    })
    return undefined
  }

  const playedAt = withDefaultStartTime(publishedAt, pool.defaultStartTime)

  if (!context.force && isAlreadyComplete(stored, encounter)) {
    context.summary.skippedSheets += 1
    return { source: encounter, home, away, playedAt, sheet: keptSheet }
  }

  return {
    source: encounter,
    home,
    away,
    playedAt,
    sheet: await resolveEncounterSheet(context, encounter, [home, away]),
  }
}

/**
 * Synchronizes one encounter already stored, whose teams are therefore known:
 * neither the pool standings nor the other encounters are downloaded.
 */
export const synchronizeSingleEncounter = async (
  context: SynchronizationContext,
  pool: PoolLocation,
  encounter: FfttEncounter,
  home: EncounterSide,
  away: EncounterSide
): Promise<void> => {
  const prepared = await prepareEncounterOfSides(
    context,
    pool,
    encounter,
    home,
    away,
    undefined
  )
  if (prepared !== undefined) {
    await persistEncounter(context, pool, prepared)
  }
}

const persistEncounter = async (
  context: SynchronizationContext,
  pool: PoolLocation,
  prepared: PreparedEncounter
): Promise<void> => {
  await context.database.transaction(async (transaction) => {
    const localEncounterId = await upsertEncounter(
      transaction,
      prepared.source,
      {
        poolId: pool.localPoolId,
        poolExternalId: pool.poolExternalId,
        homeTeamId: prepared.home.teamId,
        awayTeamId: prepared.away.teamId,
        playedAt: prepared.playedAt,
      }
    )

    const lineup = prepared.sheet.lineup
    if (lineup !== undefined) {
      await replaceEncounterLineup(transaction, localEncounterId, lineup)
      for (const member of lineup) {
        context.synchronizedLineupKeys.add(
          `${localEncounterId}:${member.playerId}`
        )
      }
    }

    const games = prepared.sheet.games
    if (games !== undefined) {
      await replaceEncounterMatches(transaction, localEncounterId, games)
      context.summary.matches += games.length
    }
  })

  context.summary.encounters += 1
}

const resolveSides = (
  context: SynchronizationContext,
  localPoolId: string,
  encounter: FfttEncounter
) => {
  const resolve = (
    side: EncounterSide['label'],
    teamLabel: string,
    encounterClubNumber: string | undefined
  ) => {
    const normalizedLabel = normalizeName(teamLabel)
    const poolKey = `${localPoolId}:${normalizedLabel}`
    // The club number published on the encounter is unreliable: the FFTT omits
    // it before the encounter is played, and once a club enters its results it
    // may carry the number of the other club. The pool standings tie each team
    // label to its club, so they are trusted first.
    const standingsClubNumber = context.clubNumbersByPoolAndLabel.get(poolKey)
    const clubNumber = standingsClubNumber ?? encounterClubNumber

    if (
      standingsClubNumber !== undefined &&
      encounterClubNumber !== undefined &&
      standingsClubNumber !== encounterClubNumber
    ) {
      context.log('FFTT encounter club number disagrees with the standings', {
        encounter: encounter.label,
        side,
        teamLabel,
        encounterClubNumber,
        standingsClubNumber,
      })
    }

    return {
      teamId:
        context.teamIdsByPoolAndLabel.get(poolKey) ??
        (clubNumber === undefined
          ? undefined
          : context.teamIdsByClubAndLabel.get(
              `${clubNumber}:${normalizedLabel}`
            )),
      clubNumber,
    }
  }

  return {
    home: resolve('home', encounter.homeTeamLabel, encounter.homeClubNumber),
    away: resolve('away', encounter.awayTeamLabel, encounter.awayClubNumber),
  }
}

export const encounterDetailsQuery = (detailsLink: string) => ({
  isReturn: linkParameter(detailsLink, 'is_retour') ?? '',
  phase: linkParameter(detailsLink, 'phase') ?? '',
  result1: linkParameter(detailsLink, 'res_1') ?? '',
  result2: linkParameter(detailsLink, 'res_2') ?? '',
  encounterId: linkParameter(detailsLink, 'renc_id') ?? '',
  team1: linkParameter(detailsLink, 'equip_1') ?? '',
  team2: linkParameter(detailsLink, 'equip_2') ?? '',
  teamId1: linkParameter(detailsLink, 'equip_id1') ?? '',
  teamId2: linkParameter(detailsLink, 'equip_id2') ?? '',
})
