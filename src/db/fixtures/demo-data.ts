import type { components } from '../../types/api.js'
import { clubs, divisions, double_matchs, encounter_lineup, encounters, players, pool_team, pools, single_matchs, team_ranking, teams } from '../schemas/index.js'

const ids = {
  clubs: {
    paris: '00000000-0000-0000-0000-000000000001',
    lyon: '00000000-0000-0000-0000-000000000002',
  },
  divisions: {
    nationale: '00000000-0000-0000-0000-000000000011',
    regionale: '00000000-0000-0000-0000-000000000012',
  },
  teams: {
    paris1: '00000000-0000-0000-0000-000000000021',
    paris2: '00000000-0000-0000-0000-000000000022',
    lyon1: '00000000-0000-0000-0000-000000000023',
    lyon2: '00000000-0000-0000-0000-000000000024',
  },
  players: {
    alice: '00000000-0000-0000-0000-000000000031',
    bob: '00000000-0000-0000-0000-000000000032',
    clara: '00000000-0000-0000-0000-000000000033',
    david: '00000000-0000-0000-0000-000000000034',
  },
  pools: {
    a: '00000000-0000-0000-0000-000000000041',
    b: '00000000-0000-0000-0000-000000000042',
  },
  rankings: {
    poolAParis1: '00000000-0000-0000-0000-000000000051',
    poolALyon1: '00000000-0000-0000-0000-000000000052',
    poolBParis2: '00000000-0000-0000-0000-000000000053',
    poolBLyon2: '00000000-0000-0000-0000-000000000054',
  },
  encounters: {
    nationaleDay1: '00000000-0000-0000-0000-000000000061',
    regionaleDay1: '00000000-0000-0000-0000-000000000062',
  },
  singleMatches: {
    nationaleDay1: '00000000-0000-0000-0000-000000000071',
    regionaleDay1: '00000000-0000-0000-0000-000000000072',
  },
  doubleMatches: {
    nationaleDay1: '00000000-0000-0000-0000-000000000081',
  },
} as const

const statusMap = {
  played: 'PLAYED',
  scheduled: 'SCHEDULED',
  reported: 'REPORTED',
} as const

export const demoSeedData = {
  clubs: [
    { id: ids.clubs.paris, name: 'TT Paris', numero: 'P001' },
    { id: ids.clubs.lyon, name: 'TT Lyon', numero: 'L001' },
  ] satisfies (typeof clubs.$inferInsert)[],
  divisions: [
    { id: ids.divisions.nationale, name: 'Nationale', level: 1 },
    { id: ids.divisions.regionale, name: 'Régionale', level: 2 },
  ] satisfies (typeof divisions.$inferInsert)[],
  teams: [
    { id: ids.teams.paris1, clubId: ids.clubs.paris },
    { id: ids.teams.paris2, clubId: ids.clubs.paris },
    { id: ids.teams.lyon1, clubId: ids.clubs.lyon },
    { id: ids.teams.lyon2, clubId: ids.clubs.lyon },
  ] satisfies (typeof teams.$inferInsert)[],
  players: [
    { id: ids.players.alice, firstName: 'Alice', lastName: 'Dupont', points: 500, clubId: ids.clubs.paris },
    { id: ids.players.bob, firstName: 'Bob', lastName: 'Martin', points: 750, clubId: ids.clubs.paris },
    { id: ids.players.clara, firstName: 'Clara', lastName: 'Durand', points: 600, clubId: ids.clubs.lyon },
    { id: ids.players.david, firstName: 'David', lastName: 'Petit', points: 800, clubId: ids.clubs.lyon },
  ] satisfies (typeof players.$inferInsert)[],
  pools: [
    { id: ids.pools.a, name: 'Poule A', divisionId: ids.divisions.nationale },
    { id: ids.pools.b, name: 'Poule B', divisionId: ids.divisions.regionale },
  ] satisfies (typeof pools.$inferInsert)[],
  poolTeams: [
    { pool_id: ids.pools.a, team_id: ids.teams.paris1 },
    { pool_id: ids.pools.a, team_id: ids.teams.lyon1 },
    { pool_id: ids.pools.b, team_id: ids.teams.paris2 },
    { pool_id: ids.pools.b, team_id: ids.teams.lyon2 },
  ] satisfies (typeof pool_team.$inferInsert)[],
  teamRankings: [
    { id: ids.rankings.poolAParis1, pool_id: ids.pools.a, team_id: ids.teams.paris1, rank: 1, points: 6, played: 2, wins: 2, draws: 0, looses: 0 },
    { id: ids.rankings.poolALyon1, pool_id: ids.pools.a, team_id: ids.teams.lyon1, rank: 2, points: 0, played: 2, wins: 0, draws: 0, looses: 2 },
    { id: ids.rankings.poolBParis2, pool_id: ids.pools.b, team_id: ids.teams.paris2, rank: 1, points: 3, played: 2, wins: 1, draws: 0, looses: 1 },
    { id: ids.rankings.poolBLyon2, pool_id: ids.pools.b, team_id: ids.teams.lyon2, rank: 2, points: 3, played: 2, wins: 1, draws: 0, looses: 1 },
  ] satisfies (typeof team_ranking.$inferInsert)[],
  encounters: [
    {
      id: ids.encounters.nationaleDay1,
      pool_id: ids.pools.a,
      home_team: ids.teams.paris1,
      away_team: ids.teams.lyon1,
      played_at: new Date('2026-01-10T00:00:00.000Z'),
      home_score: 3,
      away_score: 1,
      championship_day_number: 1,
      status: 'played',
    },
    {
      id: ids.encounters.regionaleDay1,
      pool_id: ids.pools.b,
      home_team: ids.teams.paris2,
      away_team: ids.teams.lyon2,
      played_at: new Date('2026-01-17T00:00:00.000Z'),
      home_score: 2,
      away_score: 2,
      championship_day_number: 1,
      status: 'played',
    },
  ] satisfies (typeof encounters.$inferInsert)[],
  encounterLineup: [
    { encounter_id: ids.encounters.nationaleDay1, player_id: ids.players.alice, team_id: ids.teams.paris1 },
    { encounter_id: ids.encounters.nationaleDay1, player_id: ids.players.clara, team_id: ids.teams.lyon1 },
    { encounter_id: ids.encounters.regionaleDay1, player_id: ids.players.bob, team_id: ids.teams.paris2 },
    { encounter_id: ids.encounters.regionaleDay1, player_id: ids.players.david, team_id: ids.teams.lyon2 },
  ] satisfies (typeof encounter_lineup.$inferInsert)[],
  singleMatches: [
    {
      id: ids.singleMatches.nationaleDay1,
      encounter_id: ids.encounters.nationaleDay1,
      home_player_id: ids.players.alice,
      away_player_id: ids.players.clara,
      winner_id: ids.players.alice,
    },
    {
      id: ids.singleMatches.regionaleDay1,
      encounter_id: ids.encounters.regionaleDay1,
      home_player_id: ids.players.bob,
      away_player_id: ids.players.david,
      winner_id: ids.players.david,
    },
  ] satisfies (typeof single_matchs.$inferInsert)[],
  doubleMatches: [
    {
      id: ids.doubleMatches.nationaleDay1,
      encounter_id: ids.encounters.nationaleDay1,
      home_player1_id: ids.players.alice,
      home_player2_id: ids.players.bob,
      away_player1_id: ids.players.clara,
      away_player2_id: ids.players.david,
      winner1_id: ids.players.alice,
      winner2_id: ids.players.bob,
    },
  ] satisfies (typeof double_matchs.$inferInsert)[],
} as const

const playersById = new Map(demoSeedData.players.map((player) => [player.id, player]))
const teamsById = new Map(demoSeedData.teams.map((team) => [team.id, team]))
const clubsById = new Map(demoSeedData.clubs.map((club) => [club.id, club]))
const poolsById = new Map(demoSeedData.pools.map((pool) => [pool.id, pool]))
const divisionsById = new Map(demoSeedData.divisions.map((division) => [division.id, division]))

export function buildExpectedEncounterResponse(dayNumber?: number): components['schemas']['Encounter'][] {
  return demoSeedData.encounters
    .filter((encounter) => dayNumber === undefined || encounter.championship_day_number === dayNumber)
    .map((encounter) => {
      const pool = poolsById.get(encounter.pool_id)
      const division = pool === undefined ? undefined : divisionsById.get(pool.divisionId)
      const homeTeam = teamsById.get(encounter.home_team)
      const awayTeam = teamsById.get(encounter.away_team)
      const homeClub = homeTeam === undefined ? undefined : clubsById.get(homeTeam.clubId)
      const awayClub = awayTeam === undefined ? undefined : clubsById.get(awayTeam.clubId)

      if (
        pool === undefined ||
        division === undefined ||
        homeTeam === undefined ||
        awayTeam === undefined ||
        homeClub === undefined ||
        awayClub === undefined
      ) {
        throw new Error(`Fixture inconsistency for encounter ${encounter.id}`)
      }

      const lineup = demoSeedData.encounterLineup.filter((entry) => entry.encounter_id === encounter.id)

      return {
        id: encounter.id,
        division: division.name,
        pool: pool.name,
        championshipDayNumber: encounter.championship_day_number,
        played_at: encounter.played_at.toISOString(),
        status: statusMap[encounter.status],
        homeScore: encounter.home_score ?? null,
        awayScore: encounter.away_score ?? null,
        homeTeam: {
          id: homeTeam.id,
          clubName: homeClub.name,
          isMellinet: true,
          lineup: lineup
            .filter((entry) => entry.team_id === homeTeam.id)
            .map((entry) => {
              const player = playersById.get(entry.player_id)
              if (player === undefined) {
                throw new Error(`Fixture inconsistency for player ${entry.player_id}`)
              }
              return {
                id: player.id,
                fullName: `${player.firstName} ${player.lastName}`,
                points: player.points,
              }
            }),
        },
        awayTeam: {
          id: awayTeam.id,
          clubName: awayClub.name,
          isMellinet: false,
          lineup: lineup
            .filter((entry) => entry.team_id === awayTeam.id)
            .map((entry) => {
              const player = playersById.get(entry.player_id)
              if (player === undefined) {
                throw new Error(`Fixture inconsistency for player ${entry.player_id}`)
              }
              return {
                id: player.id,
                fullName: `${player.firstName} ${player.lastName}`,
                points: player.points,
              }
            }),
        },
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id))
}
