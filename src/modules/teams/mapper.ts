import type { components } from '../../types/api.js'
import type { TeamDetailsCriteria, TeamDetailsResult } from './db.js'
import { mapEncounterSummary, mapTeamSummary } from '../encounters/mapper.js'

export const mapTeamDetails = (
  { team, pool, ranking, calendar, roster }: TeamDetailsResult,
  criteria: TeamDetailsCriteria
): components['schemas']['TeamDetails'] => ({
  ...mapTeamSummary(team),
  ...criteria,
  division:
    pool === undefined
      ? null
      : {
          name: pool.division.name,
          level: pool.division.level,
          echelon: pool.division.echelon,
        },
  pool: pool?.name ?? null,
  ranking: ranking.map((entry) => ({
    rank: entry.ranking.rank,
    team: { ...entry.team, clubName: entry.clubName },
    points: entry.ranking.points,
    played: entry.ranking.played,
    wins: entry.ranking.wins,
    draws: entry.ranking.draws,
    losses: entry.ranking.losses,
    penalties: entry.ranking.penalties,
    gamesWon: entry.ranking.games_won,
    gamesLost: entry.ranking.games_lost,
  })),
  calendar: calendar.map(mapEncounterSummary),
  players: roster.map((player) => ({
    id: player.id,
    fullName: `${player.firstName} ${player.lastName}`,
    points: player.points,
    appearances: player.appearances,
  })),
})
