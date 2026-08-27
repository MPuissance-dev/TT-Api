import { mapWithConcurrency } from '../../../shared/concurrency.js'
import { normalizeName } from '../../../shared/text.js'
import { linkParameter } from '../client.js'
import { parseFfttDate } from '../mappers.js'
import type { FfttEncounter } from '../models.js'
import type { SynchronizationContext } from './context.js'
import { resolveEncounterSheet, type ResolvedSheet } from './sheet.js'
import {
  replaceEncounterLineup,
  replaceEncounterMatches,
  upsertEncounter,
} from './repository.js'

export interface PoolLocation {
  divisionExternalId: string
  poolExternalId: string
  localPoolId: string
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

  // Everything that needs the FFTT is prepared first, several encounters at a
  // time; the writes then happen one by one so no two transactions compete.
  const prepared = await mapWithConcurrency(
    sourceEncounters,
    resultSheetConcurrency,
    (encounter) => prepareEncounter(context, pool, encounter)
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
  home: EncounterSide & { teamId: string }
  away: EncounterSide & { teamId: string }
  playedAt: Date
  sheet: ResolvedSheet
}

const prepareEncounter = async (
  context: SynchronizationContext,
  pool: PoolLocation,
  encounter: FfttEncounter
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

  const playedAt = parseFfttDate(encounter.actualDate ?? encounter.plannedDate)
  if (playedAt === undefined) {
    context.summary.skippedEncounters += 1
    context.summary.skippedEncounterReasons.missingDate += 1
    context.log('FFTT encounter skipped, unusable date', {
      encounter: encounter.label,
      plannedDate: encounter.plannedDate,
      actualDate: encounter.actualDate,
    })
    return undefined
  }

  const home = {
    label: 'home' as const,
    teamId: homeTeamId,
    clubNumber: sides.home.clubNumber,
  }
  const away = {
    label: 'away' as const,
    teamId: awayTeamId,
    clubNumber: sides.away.clubNumber,
  }

  return {
    source: encounter,
    home,
    away,
    playedAt,
    sheet: await resolveEncounterSheet(context, encounter, [home, away]),
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
  const resolve = (teamLabel: string, clubNumber: string | undefined) => {
    const normalizedLabel = normalizeName(teamLabel)
    const poolKey = `${localPoolId}:${normalizedLabel}`
    return {
      teamId:
        (clubNumber === undefined
          ? undefined
          : context.teamIdsByClubAndLabel.get(
              `${clubNumber}:${normalizedLabel}`
            )) ?? context.teamIdsByPoolAndLabel.get(poolKey),
      // The FFTT omits the club number on encounters that are not played yet.
      clubNumber: clubNumber ?? context.clubNumbersByPoolAndLabel.get(poolKey),
    }
  }

  return {
    home: resolve(encounter.homeTeamLabel, encounter.homeClubNumber),
    away: resolve(encounter.awayTeamLabel, encounter.awayClubNumber),
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
