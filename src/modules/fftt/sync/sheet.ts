import { lineupPosition } from '../mappers.js'
import type { FfttEncounter, FfttGame } from '../models.js'
import { splitGameLabel } from '../mappers.js'
import { findLicense, type SynchronizationContext } from './context.js'
import { encounterDetailsQuery, type EncounterSide } from './encounters.js'

export interface LineupMember {
  playerId: string
  teamId: string
  position: string | undefined
}

export interface ResolvedGame {
  /** Position of the game on the result sheet, starting at 1. */
  number: number
  source: FfttGame
  homePlayerIds: (string | undefined)[]
  awayPlayerIds: (string | undefined)[]
}

/**
 * What the FFTT result sheet says about an encounter. Both fields are
 * `undefined` when no readable sheet was published, in which case whatever is
 * already stored is left untouched rather than erased.
 */
export interface ResolvedSheet {
  lineup: LineupMember[] | undefined
  games: ResolvedGame[] | undefined
}

const unreadable: ResolvedSheet = { lineup: undefined, games: undefined }

/**
 * Reads the result sheet and turns every name it carries into a local player,
 * without touching the encounter itself: all the FFTT calls happen here, before
 * the transaction that writes the encounter and its sheet together opens.
 */
export const resolveEncounterSheet = async (
  context: SynchronizationContext,
  encounter: FfttEncounter,
  sides: EncounterSide[]
): Promise<ResolvedSheet> => {
  if (encounter.detailsLink === undefined) {
    return unreadable
  }

  const details = await context.client
    .getEncounterDetails(encounterDetailsQuery(encounter.detailsLink))
    .catch((error: unknown) => {
      // An unreachable result sheet must not prevent the score and the status
      // of the encounter itself from being refreshed.
      context.log('FFTT result sheet unavailable', {
        encounter: encounter.label,
        reason: error instanceof Error ? error.message : String(error),
      })
      return undefined
    })

  if (details === undefined) {
    return unreadable
  }

  // Only the rosters of the two clubs actually facing each other are downloaded.
  const rosters = new Map(
    await Promise.all(
      sides.map(
        async (side) =>
          [side.label, await context.rosterOf(side.clubNumber)] as const
      )
    )
  )

  const resolvePlayerId = (
    side: EncounterSide,
    label: string
  ): string | undefined => {
    const roster = rosters.get(side.label)
    const license = findLicense(label, roster?.licenses ?? [])
    return license === undefined
      ? undefined
      : roster?.playerIds.get(license.externalId)
  }

  const lineup: LineupMember[] = []
  const seen = new Set<string>()

  details.players.forEach((pair, index) => {
    for (const side of sides) {
      const playerLabel =
        side.label === 'home' ? pair.homePlayerLabel : pair.awayPlayerLabel
      const playerId = resolvePlayerId(side, playerLabel)

      if (playerId === undefined) {
        context.summary.unmatchedPlayers += 1
        context.log('FFTT player could not be matched to a license', {
          encounter: encounter.label,
          side: side.label,
          playerLabel,
          clubNumber: side.clubNumber,
        })
        continue
      }

      // The same license can be listed twice on a result sheet, and a single
      // statement cannot touch the same row twice.
      if (seen.has(playerId)) {
        continue
      }

      seen.add(playerId)
      lineup.push({
        playerId,
        teamId: side.teamId,
        position: lineupPosition(side.label, index),
      })
    }
  })

  const home = sides.find((side) => side.label === 'home')
  const away = sides.find((side) => side.label === 'away')

  const games = details.games.map((game, index) => ({
    number: index + 1,
    source: game,
    homePlayerIds:
      home === undefined
        ? []
        : splitGameLabel(game.homePlayerLabel).map((label) =>
            resolvePlayerId(home, label)
          ),
    awayPlayerIds:
      away === undefined
        ? []
        : splitGameLabel(game.awayPlayerLabel).map((label) =>
            resolvePlayerId(away, label)
          ),
  }))

  return { lineup, games }
}
