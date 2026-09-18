import { parseTeamLabel } from '../../teams/team.js'
import { linkParameter } from '../client.js'
import type { FfttPool, FfttTeamRanking } from '../models.js'
import type { SynchronizationContext } from './context.js'
import type { DivisionSource } from './divisions.js'
import { synchronizeEncounters } from './encounters.js'
import {
  replacePoolTeams,
  replaceTeamRankings,
  upsertPool,
  upsertTeam,
} from './repository.js'

export interface PoolStepInput {
  division: DivisionSource
  localDivisionId: string
  sourcePool: FfttPool
}

export interface PoolContext {
  divisionExternalId: string
  poolExternalId: string
  localPoolId: string
}

/**
 * The FFTT identifies a pool through the `cx_poule` parameter of its result
 * link, and only falls back to a plain identifier when there is no link.
 */
export const poolExternalIdOf = (sourcePool: FfttPool): string =>
  linkParameter(sourcePool.link ?? '', 'cx_poule') ?? sourcePool.externalId

export const synchronizePool = async (
  context: SynchronizationContext,
  input: PoolStepInput
): Promise<void> => {
  const poolExternalId = poolExternalIdOf(input.sourcePool)

  const rankings = await context.client.listPoolRankings(
    input.division.externalId,
    poolExternalId
  )

  const belongsToClub =
    input.division.poolExternalIds.has(poolExternalId) ||
    rankings.some((ranking) => ranking.clubNumber === context.clubNumber)
  if (!belongsToClub) {
    return
  }

  const localPoolId = await context.database.transaction((transaction) =>
    upsertPool(transaction, {
      ffttId: poolExternalId,
      label: input.sourcePool.label,
      divisionId: input.localDivisionId,
    })
  )
  context.summary.pools += 1

  await synchronizePoolTeams(context, localPoolId, rankings)

  await synchronizeEncounters(context, {
    divisionExternalId: input.division.externalId,
    poolExternalId,
    localPoolId,
  })
}

/**
 * The pool ranking is the only place where the FFTT lists every team of a pool
 * together with its club, which is what the encounter listing then refers to.
 */
const synchronizePoolTeams = async (
  context: SynchronizationContext,
  localPoolId: string,
  rankings: FfttTeamRanking[]
): Promise<void> => {
  const teamIds: string[] = []
  const standings: { teamId: string; source: FfttTeamRanking }[] = []

  for (const ranking of rankings) {
    const localClubId = await context.resolveClubId(ranking.clubNumber)
    if (localClubId === undefined) {
      continue
    }

    const localTeamId = await context.database.transaction((transaction) =>
      upsertTeam(transaction, {
        label: ranking.teamLabel,
        clubId: localClubId,
        ffttId: ranking.teamExternalId,
      })
    )

    const normalizedLabel = parseTeamLabel(ranking.teamLabel).normalizedName
    context.teamIdsByClubAndLabel.set(
      `${ranking.clubNumber}:${normalizedLabel}`,
      localTeamId
    )
    context.teamIdsByPoolAndLabel.set(
      `${localPoolId}:${normalizedLabel}`,
      localTeamId
    )
    context.clubNumbersByPoolAndLabel.set(
      `${localPoolId}:${normalizedLabel}`,
      ranking.clubNumber
    )
    context.synchronizedTeamIds.add(localTeamId)
    teamIds.push(localTeamId)
    standings.push({ teamId: localTeamId, source: ranking })
  }

  await context.database.transaction(async (transaction) => {
    await replacePoolTeams(transaction, localPoolId, teamIds)
    await replaceTeamRankings(transaction, localPoolId, standings)
  })
  context.summary.rankings += standings.length
}
