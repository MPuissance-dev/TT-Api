import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  inArray,
  or,
  sql,
} from 'drizzle-orm'
import { db, type Database } from '../../db/index.js'
import {
  clubs,
  divisions,
  encounter_lineup,
  encounters,
  players,
  pools,
  seasons,
  team_ranking,
  teams,
} from '../../db/schemas/index.js'
import type { ChampionshipPhase } from '../seasons/season.js'
import type { DivisionCategory } from '../divisions/division.js'

export interface TeamDetailsCriteria {
  season: string
  phase: ChampionshipPhase
  category: DivisionCategory
}

export const buildFindTeamDetails =
  (database: Database) =>
  async (teamId: string, criteria: TeamDetailsCriteria) => {
    const team = await database.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: { club: true },
    })
    if (team === undefined) {
      return undefined
    }

    // A team keeps its identity across seasons, so everything is read for one phase only.
    const poolsOfPhase = database
      .select({ id: pools.id })
      .from(pools)
      .innerJoin(divisions, eq(pools.divisionId, divisions.id))
      .innerJoin(seasons, eq(divisions.seasonId, seasons.id))
      .where(
        and(
          eq(seasons.name, criteria.season),
          eq(divisions.phase, criteria.phase),
          eq(divisions.category, criteria.category)
        )
      )

    const calendar = await database.query.encounters.findMany({
      where: and(
        inArray(encounters.pool_id, poolsOfPhase),
        or(eq(encounters.home_team, teamId), eq(encounters.away_team, teamId))
      ),
      orderBy: [
        sql`${encounters.championship_day_number} asc nulls last`,
        asc(encounters.played_at),
      ],
      with: {
        homeTeam: { with: { club: true } },
        awayTeam: { with: { club: true } },
      },
    })

    // The ranking tells the pool of the team; its encounters do when no ranking is known yet.
    const [ranked] = await database
      .select({ poolId: team_ranking.pool_id })
      .from(team_ranking)
      .where(
        and(
          eq(team_ranking.team_id, teamId),
          inArray(team_ranking.pool_id, poolsOfPhase)
        )
      )
      .limit(1)
    const poolId = ranked?.poolId ?? calendar[0]?.pool_id

    const pool =
      poolId === undefined
        ? undefined
        : await database.query.pools.findFirst({
            where: eq(pools.id, poolId),
            with: { division: true },
          })

    const ranking =
      poolId === undefined
        ? []
        : await database
            .select({
              ranking: team_ranking,
              team: { id: teams.id, name: teams.name },
              clubName: clubs.name,
            })
            .from(team_ranking)
            .innerJoin(teams, eq(team_ranking.team_id, teams.id))
            .innerJoin(clubs, eq(teams.clubId, clubs.id))
            .where(eq(team_ranking.pool_id, poolId))
            .orderBy(sql`${team_ranking.rank} asc nulls last`, asc(teams.name))

    const encounterIds = calendar.map((encounter) => encounter.id)
    const appearances = countDistinct(encounter_lineup.encounter_id)
    const roster =
      encounterIds.length === 0
        ? []
        : await database
            .select({
              id: players.id,
              firstName: players.firstName,
              lastName: players.lastName,
              points: players.points,
              appearances,
            })
            .from(encounter_lineup)
            .innerJoin(players, eq(encounter_lineup.player_id, players.id))
            .where(
              and(
                eq(encounter_lineup.team_id, teamId),
                inArray(encounter_lineup.encounter_id, encounterIds)
              )
            )
            .groupBy(players.id)
            .orderBy(
              desc(appearances),
              desc(players.points),
              asc(players.lastName)
            )

    return { team, pool, ranking, calendar, roster }
  }

export type FindTeamDetails = ReturnType<typeof buildFindTeamDetails>

export const findTeamDetails = buildFindTeamDetails(db)

export type TeamDetailsResult = NonNullable<
  Awaited<ReturnType<typeof findTeamDetails>>
>
