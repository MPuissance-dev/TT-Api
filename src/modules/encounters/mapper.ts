import type { components } from '../../types/api.js'
import type { SearchEncounterRow } from './db.js'

type ApiEncounter = components['schemas']['Encounter']

const statusMap: Record<'played' | 'scheduled' | 'reported', components['schemas']['EncounterStatus']> = {
  played: 'PLAYED',
  scheduled: 'SCHEDULED',
  reported: 'REPORTED',
}

export const mapEncounter = (row: SearchEncounterRow): ApiEncounter => ({
  id: row.id,
  division: row.pool.division.name,
  pool: row.pool.name,
  championshipDayNumber: row.championship_day_number,
  played_at: row.played_at.toISOString(),
  status: statusMap[row.status],
  homeScore: row.home_score,
  awayScore: row.away_score,
  homeTeam: {
    id: row.homeTeam.id,
    clubName: row.homeTeam.club.name,
    isMellinet: true,
    lineup: row.lineup
      .filter((l) => l.team_id === row.homeTeam.id)
      .map((l) => ({ id: l.player.id, fullName: `${l.player.firstName} ${l.player.lastName}`, points: l.player.points })),
  },
  awayTeam: {
    id: row.awayTeam.id,
    clubName: row.awayTeam.club.name,
    isMellinet: false,
    lineup: row.lineup
      .filter((l) => l.team_id === row.awayTeam.id)
      .map((l) => ({ id: l.player.id, fullName: `${l.player.firstName} ${l.player.lastName}`, points: l.player.points })),
  },
})


