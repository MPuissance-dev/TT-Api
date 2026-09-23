import { linkParameter } from '../client.js'
import type { FfttTeam } from '../models.js'
import { phaseFromDate, phaseFromLabel } from '../../seasons/season.js'
import { divisionCategoryOf } from '../../divisions/division.js'
import type { SynchronizationContext } from './context.js'
import { upsertDivision } from './repository.js'
import { synchronizePool, poolExternalIdOf } from './pools.js'

export interface DivisionSource {
  externalId: string
  label: string
  /** Wording of the FFTT event, needed to tell senior, youth and veteran championships apart. */
  eventLabel?: string | undefined
  /** Pools the club is known to play in, according to its own team listing. */
  poolExternalIds: Set<string>
}

/**
 * The FFTT does not expose the divisions of a club directly: they have to be
 * read from the result links carried by its teams.
 */
export const collectDivisions = (sourceTeams: FfttTeam[]): DivisionSource[] => {
  const divisions = new Map<string, DivisionSource>()

  for (const team of sourceTeams) {
    const link = team.divisionLink
    if (link === undefined) {
      continue
    }

    const externalId = linkParameter(link, 'D1')
    if (externalId === undefined) {
      continue
    }

    const division = divisions.get(externalId) ?? {
      externalId,
      label: team.divisionLabel ?? externalId,
      ...(team.eventLabel === undefined ? {} : { eventLabel: team.eventLabel }),
      poolExternalIds: new Set<string>(),
    }

    const poolExternalId = linkParameter(link, 'cx_poule')
    if (poolExternalId !== undefined) {
      division.poolExternalIds.add(poolExternalId)
    }

    divisions.set(externalId, division)
  }

  return [...divisions.values()]
}

export const synchronizeDivision = async (
  context: SynchronizationContext,
  division: DivisionSource
): Promise<void> => {
  const phase =
    context.forcedPhase ?? phaseFromLabel(division.label) ?? phaseFromDate()
  const category = divisionCategoryOf(division.eventLabel, division.label)

  const localDivisionId = await context.database.transaction((transaction) =>
    upsertDivision(transaction, {
      ffttId: division.externalId,
      label: division.label,
      seasonId: context.seasonId,
      phase,
      eventLabel: division.eventLabel,
    })
  )
  context.summary.divisions += 1

  const sourcePools = await context.client.listPools(division.externalId)

  // The teams of the club already name the pools they play in, so the ranking
  // of every other pool of the division never has to be downloaded.
  const knownPools = sourcePools.filter((sourcePool) =>
    division.poolExternalIds.has(poolExternalIdOf(sourcePool))
  )
  // The filter is dropped when it matches nothing, as the ranking is then the
  // only way left to tell which pools of the division concern the club.
  const relevantPools = knownPools.length === 0 ? sourcePools : knownPools

  context.log('FFTT division loaded', {
    divisionId: division.externalId,
    divisionLabel: division.label,
    phase,
    category,
    poolCount: sourcePools.length,
    relevantPoolCount: relevantPools.length,
  })

  for (const sourcePool of relevantPools) {
    await synchronizePool(context, {
      division,
      localDivisionId,
      sourcePool,
    })
  }
}
