import { and, eq, notInArray, sql } from 'drizzle-orm'
import type { Database } from '../../../db/index.js'
import {
  clubs,
  divisions,
  encounter_lineup,
  encounter_matches,
  encounters,
  players,
  pool_team,
  pools,
  seasons,
  team_ranking,
  teams,
} from '../../../db/schemas/index.js'
import type {
  FfttClub,
  FfttEncounter,
  FfttGame,
  FfttLicense,
  FfttTeamRanking,
} from '../models.js'
import {
  mapFfttClub,
  mapFfttDivision,
  mapFfttEncounter,
  mapFfttPlayer,
  mapFfttGame,
  mapFfttPool,
  mapFfttTeam,
  mapFfttTeamRanking,
  mapSeason,
  type FfttDivisionInput,
  type FfttEncounterMappingContext,
} from '../mappers.js'

/**
 * Either the connection pool or an open transaction: every write below is meant
 * to run indifferently inside or outside a transaction.
 */
export type DatabaseWriter =
  Database | Parameters<Parameters<Database['transaction']>[0]>[0]

const requireRow = <T>(row: T | undefined, subject: string): T => {
  if (row === undefined) {
    throw new Error(`Unable to upsert ${subject}`)
  }

  return row
}

export const upsertSeason = async (writer: DatabaseWriter, name: string) => {
  const values = mapSeason(name)
  const [row] = await writer
    .insert(seasons)
    .values(values)
    .onConflictDoUpdate({
      target: seasons.name,
      set: { startYear: values.startYear },
    })
    .returning({ id: seasons.id })

  return requireRow(row, `season ${name}`).id
}

export const upsertClub = async (writer: DatabaseWriter, club: FfttClub) => {
  const values = mapFfttClub(club)
  const [row] = await writer
    .insert(clubs)
    .values(values)
    .onConflictDoUpdate({
      target: clubs.ffttId,
      set: { name: values.name, numero: values.numero },
    })
    .returning({ id: clubs.id })

  return requireRow(row, `FFTT club ${club.number}`).id
}

export const upsertDivision = async (
  writer: DatabaseWriter,
  input: FfttDivisionInput
) => {
  const values = mapFfttDivision(input)
  const [row] = await writer
    .insert(divisions)
    .values(values)
    .onConflictDoUpdate({
      target: [divisions.ffttId, divisions.seasonId, divisions.phase],
      set: { name: values.name, level: values.level },
    })
    .returning({ id: divisions.id })

  return requireRow(row, `FFTT division ${input.ffttId}`).id
}

export const upsertPool = async (
  writer: DatabaseWriter,
  input: { ffttId: string; label: string; divisionId: string }
) => {
  const values = mapFfttPool(input)
  const [row] = await writer
    .insert(pools)
    .values(values)
    .onConflictDoUpdate({
      target: [pools.ffttId, pools.divisionId],
      set: { name: values.name },
    })
    .returning({ id: pools.id })

  return requireRow(row, `FFTT pool ${input.ffttId}`).id
}

export const upsertTeam = async (
  writer: DatabaseWriter,
  input: { label: string; clubId: string; ffttId?: string | undefined }
) => {
  const values = mapFfttTeam(input)
  const [row] = await writer
    .insert(teams)
    .values(values)
    .onConflictDoUpdate({
      // The FFTT reissues team identifiers every phase, so it is refreshed rather than matched on.
      target: [teams.clubId, teams.normalizedName],
      set: {
        name: values.name,
        number: values.number ?? null,
        ffttId: values.ffttId ?? null,
      },
    })
    .returning({ id: teams.id })

  return requireRow(row, `FFTT team ${input.label}`).id
}

export const upsertPlayer = async (
  writer: DatabaseWriter,
  license: FfttLicense,
  clubId: string
) => {
  const ids = await upsertPlayers(writer, [license], clubId)

  return requireRow(
    ids.get(license.externalId),
    `FFTT player ${license.licenseNumber}`
  )
}

/**
 * Persists a whole roster in a single statement: a club listing can hold
 * hundreds of licenses and one round trip each would dominate the sync time.
 * Returns the local identifier of every player, keyed by their FFTT identifier.
 */
export const upsertPlayers = async (
  writer: DatabaseWriter,
  licenses: FfttLicense[],
  clubId: string
): Promise<Map<string, string>> => {
  // A statement cannot touch the same conflicting row twice.
  const values = new Map(
    licenses.map((license) => [
      license.externalId,
      mapFfttPlayer(license, clubId),
    ])
  )

  if (values.size === 0) {
    return new Map()
  }

  const rows = await writer
    .insert(players)
    .values([...values.values()])
    .onConflictDoUpdate({
      target: players.ffttId,
      set: {
        firstName: sql`excluded."firstName"`,
        lastName: sql`excluded."lastName"`,
        points: sql`excluded.points`,
        clubId: sql`excluded.club_id`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: players.id, ffttId: players.ffttId })

  return new Map(
    rows.flatMap((row) =>
      row.ffttId === null ? [] : [[row.ffttId, row.id] as const]
    )
  )
}

export const upsertEncounter = async (
  writer: DatabaseWriter,
  encounter: FfttEncounter,
  context: FfttEncounterMappingContext
) => {
  const values = mapFfttEncounter(encounter, context)
  const [row] = await writer
    .insert(encounters)
    .values(values)
    .onConflictDoUpdate({
      // A scheduled encounter that has just been played keeps its identity: every
      // volatile field is refreshed here rather than inserted as a second row.
      target: [encounters.ffttId, encounters.pool_id],
      set: {
        home_team: values.home_team,
        away_team: values.away_team,
        played_at: values.played_at,
        championship_day_number: values.championship_day_number,
        home_score: values.home_score,
        away_score: values.away_score,
        status: values.status,
        updatedAt: new Date(),
      },
    })
    .returning({ id: encounters.id })

  return requireRow(row, `FFTT encounter ${encounter.label}`).id
}

export interface LineupMember {
  playerId: string
  teamId: string
  position?: string | undefined
}

/**
 * Makes the stored lineup match the one the FFTT publishes: members that
 * disappeared from the result sheet are removed and the others are refreshed.
 */
export const replaceEncounterLineup = async (
  writer: DatabaseWriter,
  encounterId: string,
  members: LineupMember[]
): Promise<void> => {
  const playerIds = members.map((member) => member.playerId)

  if (playerIds.length === 0) {
    await writer
      .delete(encounter_lineup)
      .where(eq(encounter_lineup.encounter_id, encounterId))
    return
  }

  await writer
    .delete(encounter_lineup)
    .where(
      and(
        eq(encounter_lineup.encounter_id, encounterId),
        notInArray(encounter_lineup.player_id, playerIds)
      )
    )

  await writer
    .insert(encounter_lineup)
    .values(
      members.map((member) => ({
        encounter_id: encounterId,
        player_id: member.playerId,
        team_id: member.teamId,
        position: member.position ?? null,
      }))
    )
    .onConflictDoUpdate({
      target: [encounter_lineup.encounter_id, encounter_lineup.player_id],
      set: {
        team_id: sql`excluded.team_id`,
        position: sql`excluded.position`,
        updatedAt: new Date(),
      },
    })
}

export interface GameToPersist {
  number: number
  source: FfttGame
  homePlayerIds: (string | undefined)[]
  awayPlayerIds: (string | undefined)[]
}

/**
 * Makes the stored games match the published result sheet. A sheet corrected by
 * the FFTT therefore replaces the previous one instead of piling up next to it.
 */
export const replaceEncounterMatches = async (
  writer: DatabaseWriter,
  encounterId: string,
  games: GameToPersist[]
): Promise<void> => {
  const numbers = games.map((game) => game.number)

  if (numbers.length === 0) {
    await writer
      .delete(encounter_matches)
      .where(eq(encounter_matches.encounter_id, encounterId))
    return
  }

  await writer
    .delete(encounter_matches)
    .where(
      and(
        eq(encounter_matches.encounter_id, encounterId),
        notInArray(encounter_matches.number, numbers)
      )
    )

  await writer
    .insert(encounter_matches)
    .values(
      games.map((game) =>
        mapFfttGame(game.source, {
          encounterId,
          number: game.number,
          homePlayerIds: game.homePlayerIds,
          awayPlayerIds: game.awayPlayerIds,
        })
      )
    )
    .onConflictDoUpdate({
      target: [encounter_matches.encounter_id, encounter_matches.number],
      set: {
        type: sql`excluded.type`,
        home_player_id: sql`excluded.home_player_id`,
        home_player2_id: sql`excluded.home_player2_id`,
        away_player_id: sql`excluded.away_player_id`,
        away_player2_id: sql`excluded.away_player2_id`,
        home_score: sql`excluded.home_score`,
        away_score: sql`excluded.away_score`,
        winner: sql`excluded.winner`,
        set_details: sql`excluded.set_details`,
        updatedAt: new Date(),
      },
    })
}

/**
 * Makes the stored pool composition match the FFTT ranking: a team that left
 * the pool is detached instead of lingering forever.
 */
export const replacePoolTeams = async (
  writer: DatabaseWriter,
  poolId: string,
  teamIds: string[]
): Promise<void> => {
  if (teamIds.length === 0) {
    return
  }

  await writer
    .delete(pool_team)
    .where(
      and(eq(pool_team.pool_id, poolId), notInArray(pool_team.team_id, teamIds))
    )

  await writer
    .insert(pool_team)
    .values(teamIds.map((teamId) => ({ pool_id: poolId, team_id: teamId })))
    .onConflictDoNothing()
}

export interface RankingToPersist {
  teamId: string
  source: FfttTeamRanking
}

/**
 * Refreshes the standings of a pool. A ranking changes every single match day,
 * so every column is updated in place.
 */
export const replaceTeamRankings = async (
  writer: DatabaseWriter,
  poolId: string,
  rankings: RankingToPersist[]
): Promise<void> => {
  if (rankings.length === 0) {
    return
  }

  const teamIds = rankings.map((ranking) => ranking.teamId)

  await writer
    .delete(team_ranking)
    .where(
      and(
        eq(team_ranking.pool_id, poolId),
        notInArray(team_ranking.team_id, teamIds)
      )
    )

  await writer
    .insert(team_ranking)
    .values(
      rankings.map((ranking) =>
        mapFfttTeamRanking(ranking.source, poolId, ranking.teamId)
      )
    )
    .onConflictDoUpdate({
      target: [team_ranking.pool_id, team_ranking.team_id],
      set: {
        rank: sql`excluded.rank`,
        points: sql`excluded.points`,
        played: sql`excluded.played`,
        wins: sql`excluded.wins`,
        draws: sql`excluded.draws`,
        losses: sql`excluded.losses`,
        penalties: sql`excluded.penalties`,
        games_won: sql`excluded.games_won`,
        games_lost: sql`excluded.games_lost`,
        updatedAt: new Date(),
      },
    })
}
