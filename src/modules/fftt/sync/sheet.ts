import { lineupPosition, splitGameLabel } from '../mappers.js'
import type {
  FfttEncounter,
  FfttEncounterDetails,
  FfttGame,
  FfttLicense,
} from '../models.js'
import { normalizeName } from '../../../shared/text.js'
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
 * Inverts a set detail so it reads from the other side: `11/9` becomes `9/11`,
 * and the FFTT signed notation (`-8 9 5`) has every sign flipped.
 */
const invertSetDetails = (setDetails: string): string =>
  setDetails
    .split(/(\s+)/)
    .map((token) => {
      const pair = /^(\d+)([/:-])(\d+)$/.exec(token)
      if (pair !== null) {
        return `${pair[3]}${pair[2]}${pair[1]}`
      }
      if (/^-\d+$/.test(token)) {
        return token.slice(1)
      }
      if (/^\d+$/.test(token)) {
        return `-${token}`
      }
      return token
    })
    .join('')

const swapSheetSides = (
  details: FfttEncounterDetails
): FfttEncounterDetails => ({
  homeTeamLabel: details.awayTeamLabel,
  awayTeamLabel: details.homeTeamLabel,
  ...(details.awayScore === undefined ? {} : { homeScore: details.awayScore }),
  ...(details.homeScore === undefined ? {} : { awayScore: details.homeScore }),
  players: details.players.map((pair) => ({
    ...(pair.awayPlayerLabel === undefined
      ? {}
      : { homePlayerLabel: pair.awayPlayerLabel }),
    ...(pair.awayPlayerRanking === undefined
      ? {}
      : { homePlayerRanking: pair.awayPlayerRanking }),
    ...(pair.homePlayerLabel === undefined
      ? {}
      : { awayPlayerLabel: pair.homePlayerLabel }),
    ...(pair.homePlayerRanking === undefined
      ? {}
      : { awayPlayerRanking: pair.homePlayerRanking }),
  })),
  games: details.games.map((game) => ({
    ...(game.awayPlayerLabel === undefined
      ? {}
      : { homePlayerLabel: game.awayPlayerLabel }),
    ...(game.awayScore === undefined ? {} : { homeScore: game.awayScore }),
    ...(game.homePlayerLabel === undefined
      ? {}
      : { awayPlayerLabel: game.homePlayerLabel }),
    ...(game.homeScore === undefined ? {} : { awayScore: game.homeScore }),
    ...(game.setDetails === undefined
      ? {}
      : { setDetails: invertSetDetails(game.setDetails) }),
  })),
})

/**
 * When a club enters its results, the FFTT sometimes publishes the result sheet
 * with the two teams swapped. The players are the most reliable evidence of
 * which column belongs to which club; the team labels are only used when the
 * players cannot tell (unknown licenses, or two teams of the same club).
 */
const isSheetSwapped = (
  encounter: FfttEncounter,
  details: FfttEncounterDetails,
  homeLicenses: FfttLicense[],
  awayLicenses: FfttLicense[]
): boolean => {
  const belongs = (label: string | undefined, licenses: FfttLicense[]) =>
    label === undefined || findLicense(label, licenses) === undefined ? 0 : 1

  let straight = 0
  let swapped = 0
  for (const pair of details.players) {
    const homeInHome = belongs(pair.homePlayerLabel, homeLicenses)
    const homeInAway = belongs(pair.homePlayerLabel, awayLicenses)
    const awayInAway = belongs(pair.awayPlayerLabel, awayLicenses)
    const awayInHome = belongs(pair.awayPlayerLabel, homeLicenses)
    straight += homeInHome - homeInAway + awayInAway - awayInHome
    swapped += homeInAway - homeInHome + awayInHome - awayInAway
  }

  if (straight !== swapped) {
    return swapped > straight
  }

  const sameTeam = (a: string, b: string) =>
    normalizeName(a) === normalizeName(b)
  return (
    !sameTeam(encounter.homeTeamLabel, encounter.awayTeamLabel) &&
    sameTeam(details.homeTeamLabel, encounter.awayTeamLabel) &&
    sameTeam(details.awayTeamLabel, encounter.homeTeamLabel)
  )
}

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

  const published = await context.client
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

  if (published === undefined) {
    return unreadable
  }

  // Only the rosters of the two clubs actually facing each other are downloaded.
  const rosters = await Promise.all(
    sides.map((side) => context.rosterOf(side.clubNumber))
  )

  const licensesOf = (label: EncounterSide['label']) =>
    sides.flatMap((side, index) =>
      side.label === label ? (rosters[index]?.licenses ?? []) : []
    )

  const swapped = isSheetSwapped(
    encounter,
    published,
    licensesOf('home'),
    licensesOf('away')
  )
  if (swapped) {
    context.log('FFTT result sheet published with swapped sides, corrected', {
      encounter: encounter.label,
      homeTeamLabel: encounter.homeTeamLabel,
      awayTeamLabel: encounter.awayTeamLabel,
    })
  }
  const details = swapped ? swapSheetSides(published) : published

  const resolvePlayerId = (label: string): string | undefined => {
    const licenses = rosters.flatMap((roster) => roster?.licenses ?? [])
    const license = findLicense(label, licenses ?? [])
    return license === undefined
      ? undefined
      : rosters
          .find((roster) => roster?.licenses?.includes(license))
          ?.playerIds.get(license.externalId)
  }

  const lineup: LineupMember[] = []
  const seen = new Set<string>()

  details.players.forEach((pair, index) => {
    for (const side of sides) {
      const playerLabel =
        side.label === 'home' ? pair.homePlayerLabel : pair.awayPlayerLabel
      // An empty slot: the team played without a player in that position.
      if (playerLabel === undefined) {
        continue
      }

      const playerId = resolvePlayerId(playerLabel)

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
        : splitGameLabel(game.homePlayerLabel ?? '').map((label) =>
            resolvePlayerId(label)
          ),
    awayPlayerIds:
      away === undefined
        ? []
        : splitGameLabel(game.awayPlayerLabel ?? '').map((label) =>
            resolvePlayerId(label)
          ),
  }))

  return { lineup, games }
}
