import type { components } from '../../types/api.js'
import type { EncounterDetailsRow, SearchEncounterRow } from './db.js'

type ApiEncounter = components['schemas']['Encounter']
type ApiTeam = components['schemas']['Team']

const statusMap: Record<
  'played' | 'scheduled' | 'reported',
  components['schemas']['EncounterStatus']
> = {
  played: 'PLAYED',
  scheduled: 'SCHEDULED',
  reported: 'REPORTED',
}

type TeamRow = SearchEncounterRow['homeTeam']

const mapTeam = (
  team: TeamRow,
  lineup: SearchEncounterRow['lineup']
): ApiTeam => ({
  id: team.id,
  name: team.name,
  clubName: team.club.name,
  lineup: lineup
    .filter((entry) => entry.team_id === team.id)
    .map((entry) => ({
      id: entry.player.id,
      fullName: `${entry.player.firstName} ${entry.player.lastName}`,
      points: entry.player.points,
    })),
})

export const mapEncounter = (row: SearchEncounterRow): ApiEncounter => ({
  id: row.id,
  division: row.pool.division.name,
  pool: row.pool.name,
  season: row.pool.division.season.name,
  phase: row.pool.division.phase,
  championshipDayNumber: row.championship_day_number,
  played_at: row.played_at.toISOString(),
  status: statusMap[row.status],
  homeScore: row.home_score,
  awayScore: row.away_score,
  homeTeam: mapTeam(row.homeTeam, row.lineup),
  awayTeam: mapTeam(row.awayTeam, row.lineup),
})

type ApiEncounterMatch = components['schemas']['EncounterMatch']
type MatchRow = EncounterDetailsRow['matches'][number]
type PlayerRow = NonNullable<MatchRow['homePlayer']>

const matchTypeMap: Record<MatchRow['type'], ApiEncounterMatch['type']> = {
  single: 'SINGLE',
  double: 'DOUBLE',
}

const winnerMap: Record<
  NonNullable<MatchRow['winner']>,
  NonNullable<ApiEncounterMatch['winner']>
> = {
  home: 'HOME',
  away: 'AWAY',
}

/** Players missing from a game, after a forfeit or when unknown, are left out. */
const mapMatchPlayers = (
  ...players: (PlayerRow | null)[]
): components['schemas']['Player'][] =>
  players
    .filter((player) => player !== null)
    .map((player) => ({
      id: player.id,
      fullName: `${player.firstName} ${player.lastName}`,
      points: player.points,
    }))

const mapMatch = (match: MatchRow): ApiEncounterMatch => ({
  number: match.number,
  type: matchTypeMap[match.type],
  homePlayers: mapMatchPlayers(match.homePlayer, match.homePlayer2),
  awayPlayers: mapMatchPlayers(match.awayPlayer, match.awayPlayer2),
  homeScore: match.home_score,
  awayScore: match.away_score,
  winner: match.winner === null ? null : winnerMap[match.winner],
  setDetails: match.set_details,
})

export const mapEncounterDetails = (
  row: EncounterDetailsRow
): components['schemas']['EncounterDetails'] => ({
  ...mapEncounter(row),
  matches: row.matches.map(mapMatch),
})

interface TeamWithClub {
  id: string
  name: string
  club: { name: string }
}

export const mapTeamSummary = (
  team: TeamWithClub
): components['schemas']['TeamSummary'] => ({
  id: team.id,
  name: team.name,
  clubName: team.club.name,
})

export const mapEncounterSummary = (encounter: {
  id: string
  championship_day_number: number | null
  played_at: Date
  status: keyof typeof statusMap
  home_score: number | null
  away_score: number | null
  homeTeam: TeamWithClub
  awayTeam: TeamWithClub
}): components['schemas']['EncounterSummary'] => ({
  id: encounter.id,
  championshipDayNumber: encounter.championship_day_number,
  played_at: encounter.played_at.toISOString(),
  status: statusMap[encounter.status],
  homeTeam: mapTeamSummary(encounter.homeTeam),
  awayTeam: mapTeamSummary(encounter.awayTeam),
  homeScore: encounter.home_score,
  awayScore: encounter.away_score,
})
