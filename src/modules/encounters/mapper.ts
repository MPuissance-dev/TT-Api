import type { components } from '../../types/api.js'
import type { SearchEncounterRow } from './db.js'

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
  lineup: SearchEncounterRow['lineup'],
  followedClubNumber?: string
): ApiTeam => ({
  id: team.id,
  name: team.name,
  clubName: team.club.name,
  isMellinet:
    followedClubNumber !== undefined && team.club.numero === followedClubNumber,
  lineup: lineup
    .filter((entry) => entry.team_id === team.id)
    .map((entry) => ({
      id: entry.player.id,
      fullName: `${entry.player.firstName} ${entry.player.lastName}`,
      points: entry.player.points,
    })),
})

export const mapEncounter = (
  row: SearchEncounterRow,
  followedClubNumber?: string
): ApiEncounter => ({
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
  homeTeam: mapTeam(row.homeTeam, row.lineup, followedClubNumber),
  awayTeam: mapTeam(row.awayTeam, row.lineup, followedClubNumber),
})
