import { and, asc, eq, inArray, or, sql } from 'drizzle-orm'
import { db, type Database } from '../../db/index.js'
import {
  clubs,
  divisions,
  encounter_lineup,
  encounter_matches,
  encounters,
  players,
  pools,
  seasons,
} from '../../db/schemas/index.js'
import type { ChampionshipPhase } from '../seasons/season.js'

/** Every category is covered: a player can play senior, youth and veteran championships alike. */
export interface PlayerDetailsCriteria {
  season: string
  phase: ChampionshipPhase
}

export const buildFindPlayerDetails =
  (database: Database) =>
  async (playerId: string, criteria: PlayerDetailsCriteria) => {
    const [player] = await database
      .select({
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
        points: players.points,
        clubName: clubs.name,
      })
      .from(players)
      .innerJoin(clubs, eq(players.clubId, clubs.id))
      .where(eq(players.id, playerId))
    if (player === undefined) {
      return undefined
    }

    const poolsOfPhase = database
      .select({ id: pools.id })
      .from(pools)
      .innerJoin(divisions, eq(pools.divisionId, divisions.id))
      .innerJoin(seasons, eq(divisions.seasonId, seasons.id))
      .where(
        and(
          eq(seasons.name, criteria.season),
          eq(divisions.phase, criteria.phase)
        )
      )

    // A player can be named on a game without being part of the published lineup.
    const lineupEncounters = database
      .select({ id: encounter_lineup.encounter_id })
      .from(encounter_lineup)
      .where(eq(encounter_lineup.player_id, playerId))
    const gameEncounters = database
      .select({ id: encounter_matches.encounter_id })
      .from(encounter_matches)
      .where(
        or(
          eq(encounter_matches.home_player_id, playerId),
          eq(encounter_matches.home_player2_id, playerId),
          eq(encounter_matches.away_player_id, playerId),
          eq(encounter_matches.away_player2_id, playerId)
        )
      )

    const playedEncounters = await database.query.encounters.findMany({
      where: and(
        inArray(encounters.pool_id, poolsOfPhase),
        or(
          inArray(encounters.id, lineupEncounters),
          inArray(encounters.id, gameEncounters)
        )
      ),
      orderBy: [
        sql`${encounters.championship_day_number} asc nulls last`,
        asc(encounters.played_at),
      ],
      with: {
        pool: { with: { division: true } },
        homeTeam: { with: { club: true } },
        awayTeam: { with: { club: true } },
        lineup: {
          where: eq(encounter_lineup.player_id, playerId),
        },
        matches: {
          orderBy: asc(encounter_matches.number),
          with: {
            homePlayer: true,
            homePlayer2: true,
            awayPlayer: true,
            awayPlayer2: true,
          },
        },
      },
    })

    return { player, encounters: playedEncounters }
  }

export type FindPlayerDetails = ReturnType<typeof buildFindPlayerDetails>

export const findPlayerDetails = buildFindPlayerDetails(db)

export type PlayerDetailsResult = NonNullable<
  Awaited<ReturnType<typeof findPlayerDetails>>
>
