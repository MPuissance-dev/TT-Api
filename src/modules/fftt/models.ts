export type FfttTimestamp = string
export type FfttDate = string

export interface FfttRequestContext {
  serie: string
  timestamp: FfttTimestamp
  timestampHash: string
  applicationId: string
}

export interface FfttInitialization {
  applicationAuthorized: boolean
  message?: string | undefined
}

export interface FfttClub {
  externalId: string
  number: string
  name: string
  validationDate?: FfttDate | undefined
}

export interface FfttClubSearch {
  department?: string | undefined
  city?: string | undefined
  number?: string | undefined
  postalCode?: string | undefined
}

export interface FfttClubDetails {
  externalId: string
  number: string
  roomName?: string | undefined
  address1?: string | undefined
  address2?: string | undefined
  address3?: string | undefined
  postalCode?: string | undefined
  city?: string | undefined
  website?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
}

export type FfttOrganizationType = 'F' | 'Z' | 'L' | 'D'

export interface FfttOrganization {
  externalId: string
  label: string
  code: string
  parentExternalId?: string | undefined
}

export type FfttEventType = 'E' | 'I'
export type FfttEventCategory = 'C' | 'I' | 'E' | 'H'

export interface FfttEvent {
  externalId: string
  organizationExternalId: string
  label: string
  type: FfttEventType
  category: FfttEventCategory
}

export interface FfttDivision {
  externalId: string
  organizationExternalId: string
  eventExternalId: string
  label: string
}

export interface FfttPool {
  externalId: string
  divisionExternalId: string
  label: string
  link?: string | undefined
}

export interface FfttTeam {
  externalId?: string | undefined
  label: string
  divisionLabel: string
  divisionLink?: string | undefined
  eventExternalId?: string | undefined
  eventLabel?: string | undefined
}

export type FfttTeamType = 'M' | 'F' | 'A' | ''

export interface FfttPoolRankingQuery {
  divisionId: string
  poolId?: string | undefined
}

export interface FfttPoolEncountersQuery {
  divisionId: string
  poolId?: string | undefined
}

export interface FfttEncounterDetailsQuery {
  isReturn: string
  phase: string
  result1: string
  result2: string
  encounterId: string
  team1: string
  team2: string
  teamId1: string
  teamId2: string
}

export interface FfttTeamRanking {
  poolLabel: string
  rank: number
  teamLabel: string
  matchesPlayed: number
  matchPoints: number
  clubNumber: string
  teamExternalId?: string | undefined
  clubExternalId?: string | undefined
  wins: number
  losses: number
  draws: number
  penalties: number
  gamesWon: number
  gamesLost: number
}

export interface FfttEncounter {
  externalId?: string | undefined
  label: string
  homeTeamLabel: string
  awayTeamLabel: string
  homeScore?: number | undefined
  awayScore?: number | undefined
  plannedDate?: FfttDate | undefined
  actualDate?: FfttDate | undefined
  detailsLink?: string | undefined
  homeClubNumber?: string | undefined
  awayClubNumber?: string | undefined
  poolExternalId?: string | undefined
  championshipDayNumber?: number | undefined
  isLive: boolean
}

export interface FfttEncounterDetails {
  homeTeamLabel: string
  awayTeamLabel: string
  homeScore?: number | undefined
  awayScore?: number | undefined
  players: FfttEncounterPlayerPair[]
  games: FfttGame[]
}

export interface FfttEncounterPlayerPair {
  homePlayerLabel: string
  homePlayerRanking?: string | undefined
  awayPlayerLabel: string
  awayPlayerRanking?: string | undefined
}

export interface FfttGame {
  homePlayerLabel: string
  homeScore?: number | undefined
  awayPlayerLabel: string
  awayScore?: number | undefined
  setDetails?: string | undefined
}

export interface FfttPlayerSummary {
  licenseNumber: string
  firstName: string
  lastName: string
  clubName: string
  clubNumber: string
  ranking?: string | undefined
}

export interface FfttPlayerRanking {
  licenseNumber: string
  firstName: string
  lastName: string
  clubName: string
  clubNumber: string
  nationality?: string | undefined
  globalRanking?: string | undefined
  monthlyPoints?: number | undefined
  previousGlobalRanking?: string | undefined
  previousMonthlyPoints?: number | undefined
  officialRanking?: string | undefined
  ageCategory?: string | undefined
  regionalRank?: number | undefined
  departmentalRank?: number | undefined
  officialPoints?: number | undefined
  proposedRanking?: string | undefined
  seasonStartPoints?: number | undefined
}

export type FfttGender = 'M' | 'F'
export type FfttLicenseType = 'T' | 'P'

export interface FfttLicense {
  externalId: string
  licenseNumber: string
  firstName: string
  lastName: string
  clubNumber: string
  clubName: string
  gender?: FfttGender | undefined
  type?: FfttLicenseType | undefined
  medicalCertificate?: string | undefined
  validationDate?: FfttDate | undefined
  echelon?: string | undefined
  nationalRank?: number | undefined
  points?: number | undefined
  ageCategory?: string | undefined
}

export interface FfttLicenseDetails extends FfttLicense {
  monthlyPoints?: number | undefined
  previousMonthlyPoints?: number | undefined
  initialPoints?: number | undefined
  mutationDate?: FfttDate | undefined
  nationality?: string | undefined
  refereeGrade?: string | undefined
  umpireGrade?: string | undefined
  technicianGrade?: string | undefined
  birthDate?: FfttDate | undefined
}

export interface FfttPlayerMatch {
  licenseNumber: string
  opponentLicenseNumber?: string | undefined
  result: 'V' | 'D'
  dayNumber?: number | undefined
  championshipCode?: string | undefined
  date?: FfttDate | undefined
  opponentName?: string | undefined
  resultPoints?: number | undefined
  eventCoefficient?: number | undefined
  opponentOfficialRanking?: string | undefined
}

export interface FfttPlayerResult {
  date?: FfttDate | undefined
  opponentName: string
  opponentRanking?: string | undefined
  eventLabel?: string | undefined
  victory: 'V' | 'D'
  isForfeit: boolean
}

export interface FfttRankingHistory {
  echelon?: string | undefined
  nationalRank?: number | undefined
  points: number
  season: string
  phase: 1 | 2
}

export interface FfttNews {
  date: FfttDate
  title: string
  description: string
  url?: string | undefined
  photoUrl?: string | undefined
}
