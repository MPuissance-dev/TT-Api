import type { InferInsertModel } from 'drizzle-orm'
import type {
  clubs,
  divisions,
  encounters,
  players,
  pool_team,
  pools,
  team_ranking,
  teams,
} from '../../db/schemas/index.js'
import type {
  FfttClub,
  FfttDivision,
  FfttEncounter,
  FfttLicense,
  FfttLicenseDetails,
  FfttPlayerRanking,
  FfttPool,
  FfttTeam,
  FfttTeamRanking,
} from './models.js'

type ClubInsert = InferInsertModel<typeof clubs>
type DivisionInsert = InferInsertModel<typeof divisions>
type PoolInsert = InferInsertModel<typeof pools>
type TeamInsert = InferInsertModel<typeof teams>
type PlayerInsert = InferInsertModel<typeof players>
type TeamRankingInsert = InferInsertModel<typeof team_ranking>
type PoolTeamInsert = InferInsertModel<typeof pool_team>

export const mapFfttClub = (club: FfttClub): ClubInsert => ({
  name: club.name,
  numero: club.number,
  ffttId: club.externalId,
})

export const mapFfttDivision = (division: FfttDivision, level: string): DivisionInsert => ({
  name: division.label,
  level,
  ffttId: division.externalId,
})

export const mapFfttPool = (pool: FfttPool, divisionId: string): PoolInsert => ({
  divisionId,
  name: pool.label,
  ffttId: pool.externalId,
})

export const mapFfttTeam = (team: FfttTeam, clubId: string): TeamInsert => ({
  clubId,
  ffttId: team.externalId,
})

type FfttPlayerSource = FfttLicense | FfttLicenseDetails | FfttPlayerRanking

const getPlayerPoints = (player: FfttPlayerSource): number => {
  if ('points' in player && player.points !== undefined) {
    return player.points
  }

  if ('monthlyPoints' in player && player.monthlyPoints !== undefined) {
    return player.monthlyPoints
  }

  if ('officialPoints' in player && player.officialPoints !== undefined) {
    return player.officialPoints
  }

  throw new Error(`No points found for FFTT player ${player.licenseNumber}`)
}

export const mapFfttPlayer = (player: FfttPlayerSource, clubId: string): PlayerInsert => {
  const ffttId = 'externalId' in player ? player.externalId : undefined

  return {
    firstName: player.firstName,
    lastName: player.lastName,
    points: getPlayerPoints(player),
    clubId,
    ...(ffttId === undefined ? {} : { ffttId }),
  }
}

export const mapFfttTeamRanking = (
  ranking: FfttTeamRanking,
  poolId: string,
  teamId: string
): TeamRankingInsert => ({
  pool_id: poolId,
  team_id: teamId,
  rank: ranking.rank,
  points: ranking.matchPoints,
  played: ranking.matchesPlayed,
  wins: ranking.wins,
  draws: ranking.draws,
  looses: ranking.losses,
})

export const mapFfttPoolTeam = (poolId: string, teamId: string): PoolTeamInsert => ({
  pool_id: poolId,
  team_id: teamId,
})

export interface FfttEncounterMappingContext {
  poolId: string
  homeTeamId: string
  awayTeamId: string
  championshipDayNumber: number
  status: 'played' | 'scheduled' | 'reported'
}

export const mapFfttEncounter = (
  encounter: FfttEncounter,
  context: FfttEncounterMappingContext
): InferInsertModel<typeof encounters> => {
  const playedAt = encounter.actualDate ?? encounter.plannedDate

  if (playedAt === undefined) {
    throw new Error(`No date found for FFTT encounter ${encounter.label}`)
  }

  const playedAtDate = new Date(playedAt)
  if (Number.isNaN(playedAtDate.getTime())) {
    throw new Error(`Invalid date found for FFTT encounter ${encounter.label}: ${playedAt}`)
  }

  return {
    ...(encounter.externalId === undefined ? {} : { ffttId: encounter.externalId }),
    pool_id: context.poolId,
    home_team: context.homeTeamId,
    away_team: context.awayTeamId,
    played_at: playedAtDate,
    championship_day_number: context.championshipDayNumber,
    home_score: encounter.homeScore,
    away_score: encounter.awayScore,
    status: context.status,
  }
}
