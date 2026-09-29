import type { components } from '../../types/api.js'
import type { PlayerDetailsCriteria, PlayerDetailsResult } from './db.js'
import { mapEncounterSummary, mapTeamSummary } from '../encounters/mapper.js'
import { invertSetDetails } from '../../shared/set-details.js'

type Schemas = components['schemas']
type EncounterRow = PlayerDetailsResult['encounters'][number]
type MatchRow = EncounterRow['matches'][number]
type PlayerRow = NonNullable<MatchRow['homePlayer']>
type Side = 'home' | 'away'

const mapPlayer = (player: PlayerRow): Schemas['Player'] => ({
  id: player.id,
  fullName: `${player.firstName} ${player.lastName}`,
  points: player.points,
})

const sidePlayers = (match: MatchRow, side: Side) =>
  (side === 'home'
    ? [match.homePlayer, match.homePlayer2]
    : [match.awayPlayer, match.awayPlayer2]
  ).filter((player) => player !== null)

const sideOf = (match: MatchRow, playerId: string): Side | undefined => {
  if (sidePlayers(match, 'home').some((player) => player.id === playerId)) {
    return 'home'
  }
  if (sidePlayers(match, 'away').some((player) => player.id === playerId)) {
    return 'away'
  }
  return undefined
}

/** The lineup tells the side of the player; the games do when it is missing. */
const encounterSideOf = (encounter: EncounterRow, playerId: string): Side => {
  const teamId = encounter.lineup[0]?.team_id
  if (teamId === encounter.homeTeam.id) {
    return 'home'
  }
  if (teamId === encounter.awayTeam.id) {
    return 'away'
  }

  return (
    encounter.matches
      .map((match) => sideOf(match, playerId))
      .find((side) => side !== undefined) ?? 'home'
  )
}

const mapGame = (
  match: MatchRow,
  side: Side,
  playerId: string
): Schemas['PlayerGame'] => {
  const opponentSide: Side = side === 'home' ? 'away' : 'home'
  const [scoreFor, scoreAgainst] =
    side === 'home'
      ? [match.home_score, match.away_score]
      : [match.away_score, match.home_score]
  const partner = sidePlayers(match, side).find(
    (player) => player.id !== playerId
  )

  return {
    number: match.number,
    type: match.type === 'single' ? 'SINGLE' : 'DOUBLE',
    partner: partner === undefined ? null : mapPlayer(partner),
    opponents: sidePlayers(match, opponentSide).map(mapPlayer),
    result:
      match.winner === null ? null : match.winner === side ? 'WON' : 'LOST',
    scoreFor,
    scoreAgainst,
    // The FFTT publishes set details from the home side.
    setDetails:
      match.set_details === null || side === 'home'
        ? match.set_details
        : invertSetDetails(match.set_details),
  }
}

const emptyRecord = (): Schemas['GameRecord'] => ({ won: 0, lost: 0 })

export const mapPlayerDetails = (
  { player, encounters }: PlayerDetailsResult,
  criteria: PlayerDetailsCriteria
): Schemas['PlayerDetails'] => {
  const record = {
    encounters: encounters.length,
    singles: emptyRecord(),
    doubles: emptyRecord(),
  }
  const teams = new Map<string, Schemas['PlayerDetails']['teams'][number]>()

  const playedEncounters = encounters.map((encounter) => {
    const side = encounterSideOf(encounter, player.id)
    const team = mapTeamSummary(
      side === 'home' ? encounter.homeTeam : encounter.awayTeam
    )
    const games = encounter.matches
      .filter((match) => sideOf(match, player.id) === side)
      .map((match) => mapGame(match, side, player.id))

    for (const game of games) {
      const gameRecord =
        game.type === 'SINGLE' ? record.singles : record.doubles
      if (game.result === 'WON') {
        gameRecord.won += 1
      } else if (game.result === 'LOST') {
        gameRecord.lost += 1
      }
    }

    const appearances = teams.get(team.id)?.appearances ?? 0
    teams.set(team.id, { team, appearances: appearances + 1 })

    return {
      encounter: mapEncounterSummary(encounter),
      category: encounter.pool.division.category,
      team,
      games,
    }
  })

  return {
    ...player,
    fullName: `${player.firstName} ${player.lastName}`,
    ...criteria,
    record,
    teams: [...teams.values()].sort(
      (a, b) =>
        b.appearances - a.appearances || a.team.name.localeCompare(b.team.name)
    ),
    encounters: playedEncounters,
  }
}
