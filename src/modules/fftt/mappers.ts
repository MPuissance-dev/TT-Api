import { createHash } from 'node:crypto'
import type { InferInsertModel } from 'drizzle-orm'
import type {
  clubs,
  divisions,
  encounters,
  players,
  encounter_matches,
  encounterMatchType,
  encounterMatchWinner,
  encounterStatus,
  pool_team,
  pools,
  seasons,
  team_ranking,
  teams,
} from '../../db/schemas/index.js'
import { collapseWhitespace, normalizeName } from '../../shared/text.js'
import { parseDivisionLabel } from '../divisions/division.js'
import { parseTeamLabel } from '../teams/team.js'
import { seasonStartYear, type ChampionshipPhase } from '../seasons/season.js'
import type {
  FfttClub,
  FfttEncounter,
  FfttGame,
  FfttLicense,
  FfttLicenseDetails,
  FfttPlayerRanking,
  FfttTeamRanking,
} from './models.js'

type SeasonInsert = InferInsertModel<typeof seasons>
type ClubInsert = InferInsertModel<typeof clubs>
type DivisionInsert = InferInsertModel<typeof divisions>
type PoolInsert = InferInsertModel<typeof pools>
type TeamInsert = InferInsertModel<typeof teams>
type PlayerInsert = InferInsertModel<typeof players>
type TeamRankingInsert = InferInsertModel<typeof team_ranking>
type PoolTeamInsert = InferInsertModel<typeof pool_team>
type EncounterInsert = InferInsertModel<typeof encounters>
type EncounterMatchInsert = InferInsertModel<typeof encounter_matches>

export type EncounterStatus = (typeof encounterStatus.enumValues)[number]

export const mapSeason = (name: string): SeasonInsert => ({
  name,
  startYear: seasonStartYear(name),
})

export const mapFfttClub = (club: FfttClub): ClubInsert => ({
  name: club.name,
  numero: club.number,
  ffttId: club.externalId,
})

export interface FfttDivisionInput {
  ffttId: string
  label: string
  seasonId: string
  phase: ChampionshipPhase
}

export const mapFfttDivision = (input: FfttDivisionInput): DivisionInsert => {
  const parsed = parseDivisionLabel(input.label)

  return {
    ffttId: input.ffttId,
    seasonId: input.seasonId,
    phase: input.phase,
    name: parsed.name,
    level: parsed.level,
  }
}

export const mapFfttPool = (input: {
  ffttId: string
  label: string
  divisionId: string
}): PoolInsert => ({
  divisionId: input.divisionId,
  name: input.label,
  ffttId: input.ffttId,
})

export const mapFfttTeam = (input: {
  label: string
  clubId: string
  ffttId?: string | undefined
}): TeamInsert => {
  const parsed = parseTeamLabel(input.label)

  return {
    clubId: input.clubId,
    name: parsed.name,
    normalizedName: parsed.normalizedName,
    ...(parsed.number === undefined ? {} : { number: parsed.number }),
    ...(input.ffttId === undefined ? {} : { ffttId: input.ffttId }),
  }
}

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

export const mapFfttPlayer = (
  player: FfttPlayerSource,
  clubId: string
): PlayerInsert => {
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
  losses: ranking.losses,
  penalties: ranking.penalties,
  games_won: ranking.gamesWon,
  games_lost: ranking.gamesLost,
})

export const mapFfttPoolTeam = (
  poolId: string,
  teamId: string
): PoolTeamInsert => ({
  pool_id: poolId,
  team_id: teamId,
})

const buildUtcDate = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number
): Date | undefined => {
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes))
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day

  return isValid ? date : undefined
}

/**
 * FFTT exposes Paris wall-clock dates without any time zone. They are built on the UTC calendar so
 * that the `timestamp without time zone` columns keep the exact day and time announced by the FFTT.
 */
export const parseFfttDate = (value: string | undefined): Date | undefined => {
  const trimmed = value?.trim()
  if (trimmed === undefined || trimmed.length === 0) {
    return undefined
  }

  const european = trimmed.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[\sT]+(\d{1,2})[:h](\d{2}))?/
  )
  if (european !== null) {
    return buildUtcDate(
      Number(european[3]),
      Number(european[2]),
      Number(european[1]),
      Number(european[4] ?? 0),
      Number(european[5] ?? 0)
    )
  }

  const iso = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[\sT]+(\d{1,2}):(\d{2}))?/
  )
  if (iso !== null) {
    return buildUtcDate(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3]),
      Number(iso[4] ?? 0),
      Number(iso[5] ?? 0)
    )
  }

  return undefined
}

const isPlayed = (encounter: FfttEncounter): boolean => {
  const { homeScore, awayScore } = encounter
  if (homeScore === undefined || awayScore === undefined) {
    return false
  }

  // A general forfeit is reported as 0-0, so the presence of a result sheet is what settles the case.
  return homeScore > 0 || awayScore > 0 || encounter.detailsLink !== undefined
}

const isReported = (encounter: FfttEncounter): boolean => {
  const planned = parseFfttDate(encounter.plannedDate)
  const actual = parseFfttDate(encounter.actualDate)

  return (
    planned !== undefined &&
    actual !== undefined &&
    planned.getTime() !== actual.getTime()
  )
}

export const getEncounterStatus = (
  encounter: FfttEncounter
): EncounterStatus => {
  if (isPlayed(encounter)) {
    return 'played'
  }

  return isReported(encounter) ? 'reported' : 'scheduled'
}

/**
 * The identity of an encounter is its fixture: pool plus home and away teams. The date is
 * deliberately excluded so that a rescheduled match is updated, and `renc_id` is excluded as well
 * because the FFTT only publishes it once the match has been played.
 */
export const encounterExternalId = (
  encounter: FfttEncounter,
  poolExternalId: string
): string => {
  const source = [
    poolExternalId,
    normalizeName(encounter.homeTeamLabel),
    normalizeName(encounter.awayTeamLabel),
  ].join('|')

  return `fixture:${createHash('sha256').update(source).digest('hex').slice(0, 40)}`
}

export interface FfttEncounterMappingContext {
  poolId: string
  poolExternalId: string
  homeTeamId: string
  awayTeamId: string
  playedAt: Date
}

export const mapFfttEncounter = (
  encounter: FfttEncounter,
  context: FfttEncounterMappingContext
): EncounterInsert => ({
  ffttId: encounterExternalId(encounter, context.poolExternalId),
  pool_id: context.poolId,
  home_team: context.homeTeamId,
  away_team: context.awayTeamId,
  played_at: context.playedAt,
  championship_day_number: encounter.championshipDayNumber,
  home_score: encounter.homeScore,
  away_score: encounter.awayScore,
  status: getEncounterStatus(encounter),
})

export type EncounterMatchType = (typeof encounterMatchType.enumValues)[number]
export type EncounterMatchWinner =
  (typeof encounterMatchWinner.enumValues)[number]

/**
 * A doubles game is published on the same list as the singles, with both names
 * in a single field. Only separators surrounded by spaces or a slash are used,
 * so a composed name such as `Jean-Pierre` is left alone.
 */
export const splitGameLabel = (label: string): string[] =>
  collapseWhitespace(label)
    .split(/\s+-\s+|\s*\/\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

/**
 * The winner is deduced from the sets, and stays unknown when the game was not
 * played at all, which is how the FFTT publishes a forfeit.
 */
export const getGameWinner = (
  game: FfttGame
): EncounterMatchWinner | undefined => {
  const home = game.homeScore
  const away = game.awayScore
  if (home === undefined || away === undefined || home === away) {
    return undefined
  }

  return home > away ? 'home' : 'away'
}

export interface FfttGameMappingContext {
  encounterId: string
  /** Position of the game on the result sheet, starting at 1. */
  number: number
  homePlayerIds: (string | undefined)[]
  awayPlayerIds: (string | undefined)[]
}

export const mapFfttGame = (
  game: FfttGame,
  context: FfttGameMappingContext
): EncounterMatchInsert => {
  const isDouble =
    context.homePlayerIds.length > 1 || context.awayPlayerIds.length > 1

  return {
    encounter_id: context.encounterId,
    number: context.number,
    type: isDouble ? 'double' : 'single',
    home_player_id: context.homePlayerIds[0] ?? null,
    home_player2_id: context.homePlayerIds[1] ?? null,
    away_player_id: context.awayPlayerIds[0] ?? null,
    away_player2_id: context.awayPlayerIds[1] ?? null,
    home_score: game.homeScore ?? null,
    away_score: game.awayScore ?? null,
    winner: getGameWinner(game) ?? null,
    set_details: game.setDetails ?? null,
  }
}

/** Slot of a player on the result sheet: A to D at home, W to Z away. */
export const lineupPosition = (
  side: 'home' | 'away',
  index: number
): string | undefined => {
  const positions = side === 'home' ? 'ABCD' : 'WXYZ'
  return positions[index]
}
