import type { SearchEncounterRow } from '../encounters/db.js'

/**
 * Strict view model consumed by the poster templates. The generated OpenAPI
 * types mark every property optional, which is fine over the wire but makes a
 * layout impossible to write without defensive checks everywhere.
 */
export interface PosterPlayer {
  readonly fullName: string
  readonly points: number | null
}

export interface PosterTeam {
  readonly name: string
  readonly clubName: string
  readonly lineup: PosterPlayer[]
}

export type PosterEncounterStatus = 'PLAYED' | 'SCHEDULED' | 'REPORTED'

export interface PosterEncounter {
  readonly division: string
  readonly pool: string
  readonly season: string
  readonly phase: number
  readonly championshipDayNumber: number | null
  readonly playedAt: string
  readonly status: PosterEncounterStatus
  readonly homeScore: number | null
  readonly awayScore: number | null
  readonly homeTeam: PosterTeam
  readonly awayTeam: PosterTeam
}

const statusMap: Record<SearchEncounterRow['status'], PosterEncounterStatus> = {
  played: 'PLAYED',
  scheduled: 'SCHEDULED',
  reported: 'REPORTED',
}

const toPosterTeam = (
  team: SearchEncounterRow['homeTeam'],
  lineup: SearchEncounterRow['lineup']
): PosterTeam => ({
  name: team.name,
  clubName: team.club.name,
  lineup: lineup
    .filter((entry) => entry.team_id === team.id)
    .map((entry) => ({
      fullName: `${entry.player.firstName} ${entry.player.lastName}`,
      points: entry.player.points,
    })),
})

export const toPosterEncounter = (
  row: SearchEncounterRow
): PosterEncounter => ({
  division: row.pool.division.name,
  pool: row.pool.name,
  season: row.pool.division.season.name,
  phase: row.pool.division.phase,
  championshipDayNumber: row.championship_day_number,
  playedAt: row.played_at.toISOString(),
  status: statusMap[row.status],
  homeScore: row.home_score,
  awayScore: row.away_score,
  homeTeam: toPosterTeam(row.homeTeam, row.lineup),
  awayTeam: toPosterTeam(row.awayTeam, row.lineup),
})
