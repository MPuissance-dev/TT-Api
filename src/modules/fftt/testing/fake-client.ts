import type { FfttClient } from '../client.js'
import type {
  FfttClub,
  FfttClubDetails,
  FfttEncounter,
  FfttEncounterDetails,
  FfttInitialization,
  FfttLicense,
  FfttLicenseDetails,
  FfttPlayerSummary,
  FfttPool,
  FfttTeam,
  FfttTeamRanking,
} from '../models.js'

export interface FfttScenario {
  initialization?: FfttInitialization
  clubs: FfttClub[]
  teamsByClub?: Record<string, FfttTeam[]>
  licensesByClub?: Record<string, FfttLicense[]>
  poolsByDivision?: Record<string, FfttPool[]>
  /** Keyed by `${divisionId}:${poolId}`. */
  rankingsByPool?: Record<string, FfttTeamRanking[]>
  /** Keyed by `${divisionId}:${poolId}`. */
  encountersByPool?: Record<string, FfttEncounter[]>
  /** Keyed by the `renc_id` query parameter of the encounter details link. */
  encounterDetails?: Record<string, FfttEncounterDetails>
}

export interface FakeFfttClient {
  client: FfttClient
  calls: string[]
  countCalls: (method: string) => number
}

const unsupported = (method: string) => (): never => {
  throw new Error(`The FFTT fake client does not implement ${method}`)
}

export const createFakeFfttClient = (
  scenario: FfttScenario
): FakeFfttClient => {
  const calls: string[] = []
  const record = (call: string) => {
    calls.push(call)
  }

  const client: FfttClient = {
    async initialize(): Promise<FfttInitialization> {
      record('initialize')
      return scenario.initialization ?? { applicationAuthorized: true }
    },

    async searchClubs(search): Promise<FfttClub[]> {
      record(`searchClubs:${search.number ?? ''}`)
      return scenario.clubs.filter(
        (club) => search.number === undefined || club.number === search.number
      )
    },

    async listTeams(clubNumber): Promise<FfttTeam[]> {
      record(`listTeams:${clubNumber}`)
      return scenario.teamsByClub?.[clubNumber] ?? []
    },

    async listLicensesByClub(clubNumber): Promise<FfttLicense[]> {
      record(`listLicensesByClub:${clubNumber}`)
      return scenario.licensesByClub?.[clubNumber] ?? []
    },

    async listPools(divisionId): Promise<FfttPool[]> {
      record(`listPools:${divisionId}`)
      return scenario.poolsByDivision?.[divisionId] ?? []
    },

    async listPoolRankings(divisionId, poolId): Promise<FfttTeamRanking[]> {
      record(`listPoolRankings:${divisionId}:${poolId ?? ''}`)
      return scenario.rankingsByPool?.[`${divisionId}:${poolId ?? ''}`] ?? []
    },

    async listPoolEncounters(divisionId, poolId): Promise<FfttEncounter[]> {
      record(`listPoolEncounters:${divisionId}:${poolId ?? ''}`)
      return scenario.encountersByPool?.[`${divisionId}:${poolId ?? ''}`] ?? []
    },

    async getEncounterDetails(query): Promise<FfttEncounterDetails> {
      record(`getEncounterDetails:${query.encounterId}`)
      const details = scenario.encounterDetails?.[query.encounterId]
      if (details === undefined) {
        throw new Error(`FFTT encounter not found: ${query.encounterId}`)
      }

      return details
    },

    listClubsByDepartment: unsupported(
      'listClubsByDepartment'
    ) as unknown as () => Promise<FfttClub[]>,
    getClubDetails: unsupported(
      'getClubDetails'
    ) as unknown as () => Promise<FfttClubDetails>,
    listOrganizations: unsupported('listOrganizations') as never,
    listEvents: unsupported('listEvents') as never,
    listDivisions: unsupported('listDivisions') as never,
    listEncounters: unsupported('listEncounters') as unknown as () => Promise<
      FfttEncounter[]
    >,
    listPlayersByClub: unsupported(
      'listPlayersByClub'
    ) as unknown as () => Promise<FfttPlayerSummary[]>,
    getLicense: unsupported(
      'getLicense'
    ) as unknown as () => Promise<FfttLicenseDetails>,
  }

  return {
    client,
    calls,
    countCalls: (method) =>
      calls.filter((call) => call === method || call.startsWith(`${method}:`))
        .length,
  }
}
