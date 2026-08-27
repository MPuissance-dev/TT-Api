import type { Database } from '../../../db/index.js'
import { nameKey } from '../../../shared/text.js'
import type { ChampionshipPhase } from '../../seasons/season.js'
import type { FfttClient } from '../client.js'
import type { FfttLicense } from '../models.js'
import { upsertClub, upsertPlayers } from './repository.js'

export type FfttSynchronizationLogger = (
  message: string,
  context: Record<string, unknown>
) => void

export interface FfttSynchronizationSummary {
  clubNumber: string
  season: string
  divisions: number
  pools: number
  clubs: number
  teams: number
  players: number
  encounters: number
  lineups: number
  /** Individual games recorded from the result sheets. */
  matches: number
  /** Pool standings recorded. */
  rankings: number
  unmatchedPlayers: number
  skippedEncounters: number
  skippedEncounterReasons: {
    missingTeams: number
    missingDate: number
  }
}

export interface ClubRoster {
  licenses: FfttLicense[]
  /** Local player identifier, keyed by FFTT license identifier. */
  playerIds: Map<string, string>
}

const emptyRoster: ClubRoster = { licenses: [], playerIds: new Map() }

export interface SynchronizationContext {
  readonly client: FfttClient
  readonly database: Database
  readonly log: FfttSynchronizationLogger
  readonly clubNumber: string
  readonly seasonId: string
  readonly seasonName: string
  /** Overrides the phase deduced from the FFTT division labels. */
  readonly forcedPhase: ChampionshipPhase | undefined
  readonly summary: FfttSynchronizationSummary
  /** Local identifier of a team, keyed by `<club number>:<normalized label>`. */
  readonly teamIdsByClubAndLabel: Map<string, string>
  /** Fallback used when the FFTT omits the club number of an encounter side. */
  readonly teamIdsByPoolAndLabel: Map<string, string>
  readonly clubNumbersByPoolAndLabel: Map<string, string>
  readonly synchronizedTeamIds: Set<string>
  readonly synchronizedPlayerIds: Set<string>
  readonly synchronizedLineupKeys: Set<string>
  /** Resolves a FFTT club number to its local identifier, fetching it once. */
  resolveClubId(clubNumber: string): Promise<string | undefined>
  /**
   * Loads and persists the roster of a club, at most once per synchronization
   * and only when a result sheet actually needs it.
   */
  rosterOf(clubNumber: string | undefined): Promise<ClubRoster>
}

export interface SynchronizationContextInput {
  client: FfttClient
  database: Database
  log: FfttSynchronizationLogger
  clubNumber: string
  clubId: string
  seasonId: string
  seasonName: string
  forcedPhase: ChampionshipPhase | undefined
}

export const createSynchronizationContext = (
  input: SynchronizationContextInput
): SynchronizationContext => {
  // Promises are memoized rather than results, so concurrent callers share the
  // very same FFTT request instead of racing each other.
  const rosters = new Map<string, Promise<ClubRoster>>()
  const clubIds = new Map<string, Promise<string | undefined>>([
    [input.clubNumber, Promise.resolve<string | undefined>(input.clubId)],
  ])

  const summary: FfttSynchronizationSummary = {
    clubNumber: input.clubNumber,
    season: input.seasonName,
    divisions: 0,
    pools: 0,
    clubs: 1,
    teams: 0,
    players: 0,
    encounters: 0,
    lineups: 0,
    matches: 0,
    rankings: 0,
    unmatchedPlayers: 0,
    skippedEncounters: 0,
    skippedEncounterReasons: { missingTeams: 0, missingDate: 0 },
  }

  const fetchClubId = async (
    clubNumber: string
  ): Promise<string | undefined> => {
    const [found] = await input.client.searchClubs({ number: clubNumber })
    if (found === undefined) {
      input.log('FFTT club not found, skipped', { clubNumber })
      return undefined
    }

    const localClubId = await upsertClub(input.database, found)
    summary.clubs += 1
    return localClubId
  }

  const context: SynchronizationContext = {
    client: input.client,
    database: input.database,
    log: input.log,
    clubNumber: input.clubNumber,
    seasonId: input.seasonId,
    seasonName: input.seasonName,
    forcedPhase: input.forcedPhase,
    summary,
    teamIdsByClubAndLabel: new Map(),
    teamIdsByPoolAndLabel: new Map(),
    clubNumbersByPoolAndLabel: new Map(),
    synchronizedTeamIds: new Set(),
    synchronizedPlayerIds: new Set(),
    synchronizedLineupKeys: new Set(),

    async resolveClubId(clubNumber) {
      const known = clubIds.get(clubNumber)
      if (known !== undefined) {
        return known
      }

      const pending = fetchClubId(clubNumber)
      clubIds.set(clubNumber, pending)
      return pending
    },

    async rosterOf(clubNumber) {
      if (clubNumber === undefined) {
        return emptyRoster
      }

      const known = rosters.get(clubNumber)
      if (known !== undefined) {
        return known
      }

      const pending = loadRoster(context, clubNumber)
      rosters.set(clubNumber, pending)
      return pending
    },
  }

  return context
}

/**
 * A player listed by a club can be licensed elsewhere after a transfer, so the
 * roster is split per declared club before being written.
 */
const loadRoster = async (
  context: SynchronizationContext,
  clubNumber: string
): Promise<ClubRoster> => {
  const licenses = await context.client.listLicensesByClub(clubNumber)

  const licensesByClubNumber = new Map<string, FfttLicense[]>()
  for (const license of licenses) {
    const group = licensesByClubNumber.get(license.clubNumber) ?? []
    group.push(license)
    licensesByClubNumber.set(license.clubNumber, group)
  }

  const groups: { clubId: string; licenses: FfttLicense[] }[] = []
  for (const [number, group] of licensesByClubNumber) {
    const clubId = await context.resolveClubId(number)
    if (clubId === undefined) {
      continue
    }

    groups.push({ clubId, licenses: group })
  }

  const playerIds = new Map<string, string>()
  await context.database.transaction(async (transaction) => {
    for (const group of groups) {
      const ids = await upsertPlayers(transaction, group.licenses, group.clubId)
      for (const [externalId, playerId] of ids) {
        playerIds.set(externalId, playerId)
        context.synchronizedPlayerIds.add(playerId)
      }
    }
  })

  return { licenses, playerIds }
}

/**
 * The FFTT alternates between `NOM Prénom` and `Prénom NOM`, and composed names
 * are not always written in the same order, so licenses are matched on the set
 * of their name tokens rather than on a concatenation.
 */
export const findLicense = (
  label: string,
  licenses: FfttLicense[]
): FfttLicense | undefined => {
  const target = nameKey(label)
  return licenses.find(
    (license) => nameKey(`${license.firstName} ${license.lastName}`) === target
  )
}
