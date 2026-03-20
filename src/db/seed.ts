/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-enable @typescript-eslint/ban-ts-comment */
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { clubs } from './schemas/clubs.js'
import { divisions } from './schemas/divisions.js'
import { teams } from './schemas/teams.js'
import { players } from './schemas/players.js'
import { pools } from './schemas/pools.js'
import { pool_team } from './schemas/pool_team.js'
import { encounters } from './schemas/encounter.js'
import { encounter_lineup } from './schemas/encounter_lineup.js'
import { single_matchs } from './schemas/single_matchs.js'
import { double_matchs } from './schemas/double_matchs.js'
import { team_ranking } from './schemas/team_ranking.js'

async function insert(db: NodePgDatabase, table: unknown, values: unknown[]) {
  const rows = await db.insert(table).values(values).returning()
  if (rows.length !== values.length) {
    throw new Error(`Expected ${values.length} rows, got ${rows.length}`)
  }
  return rows
}

export async function seedDatabase(db: NodePgDatabase) {
  // 1. Clubs
  const [clubParis, clubLyon] = await insert(db, clubs, [
    { name: 'TT Paris', numero: 'P001' },
    { name: 'TT Lyon', numero: 'L001' },
  ])

  // 2. Divisions
  const [divNationale, divRegionale] = await insert(db, divisions, [
    { name: 'Nationale', level: 1 },
    { name: 'Régionale', level: 2 },
  ])

  // 3. Teams
  const [teamParis1, teamParis2, teamLyon1, teamLyon2] = await insert(
    db,
    teams,
    [
      { clubId: clubParis.id },
      { clubId: clubParis.id },
      { clubId: clubLyon.id },
      { clubId: clubLyon.id },
    ]
  )

  // 4. Players
  const [playerAlice, playerBob, playerClara, playerDavid] = await insert(
    db,
    players,
    [
      {
        firstName: 'Alice',
        lastName: 'Dupont',
        points: '500',
        clubId: clubParis.id,
      },
      {
        firstName: 'Bob',
        lastName: 'Martin',
        points: '750',
        clubId: clubParis.id,
      },
      {
        firstName: 'Clara',
        lastName: 'Durand',
        points: '600',
        clubId: clubLyon.id,
      },
      {
        firstName: 'David',
        lastName: 'Petit',
        points: '800',
        clubId: clubLyon.id,
      },
    ]
  )

  // 5. Pools
  const [poolA, poolB] = await insert(db, pools, [
    { name: 'Poule A', divisionId: divNationale.id },
    { name: 'Poule B', divisionId: divRegionale.id },
  ])

  // 6. Pool <-> Team
  await insert(db, pool_team, [
    { pool_id: poolA.id, team_id: teamParis1.id },
    { pool_id: poolA.id, team_id: teamLyon1.id },
    { pool_id: poolB.id, team_id: teamParis2.id },
    { pool_id: poolB.id, team_id: teamLyon2.id },
  ])

  // 7. Team Rankings
  await insert(db, team_ranking, [
    {
      pool_id: poolA.id,
      team_id: teamParis1.id,
      rank: 1,
      points: 6,
      played: 2,
      wins: 2,
      draws: 0,
      looses: 0,
    },
    {
      pool_id: poolA.id,
      team_id: teamLyon1.id,
      rank: 2,
      points: 0,
      played: 2,
      wins: 0,
      draws: 0,
      looses: 2,
    },
    {
      pool_id: poolB.id,
      team_id: teamParis2.id,
      rank: 1,
      points: 3,
      played: 2,
      wins: 1,
      draws: 0,
      looses: 1,
    },
    {
      pool_id: poolB.id,
      team_id: teamLyon2.id,
      rank: 2,
      points: 3,
      played: 2,
      wins: 1,
      draws: 0,
      looses: 1,
    },
  ])

  // 8. Encounters
  const [encounter1, encounter2] = await insert(db, encounters, [
    {
      pool_id: poolA.id,
      home_team: teamParis1.id,
      away_team: teamLyon1.id,
      played_at: new Date('2026-01-10'),
      home_score: 3,
      away_score: 1,
      championship_day_number: 1,
      status: 'played',
    },
    {
      pool_id: poolB.id,
      home_team: teamParis2.id,
      away_team: teamLyon2.id,
      played_at: new Date('2026-01-17'),
      home_score: 2,
      away_score: 2,
      championship_day_number: 1,
      status: 'played',
    },
  ])

  // 9. Encounter Lineups
  await insert(db, encounter_lineup, [
    {
      encounter_id: encounter1.id,
      player_id: playerAlice.id,
      team_id: teamParis1.id,
    },
    {
      encounter_id: encounter1.id,
      player_id: playerClara.id,
      team_id: teamLyon1.id,
    },
    {
      encounter_id: encounter2.id,
      player_id: playerBob.id,
      team_id: teamParis2.id,
    },
    {
      encounter_id: encounter2.id,
      player_id: playerDavid.id,
      team_id: teamLyon2.id,
    },
  ])

  // 10. Single Matchs
  await insert(db, single_matchs, [
    {
      encounter_id: encounter1.id,
      home_player_id: playerAlice.id,
      away_player_id: playerClara.id,
      winner_id: playerAlice.id,
    },
    {
      encounter_id: encounter2.id,
      home_player_id: playerBob.id,
      away_player_id: playerDavid.id,
      winner_id: playerDavid.id,
    },
  ])

  // 11. Double Matchs
  await insert(db, double_matchs, [
    {
      encounter_id: encounter1.id,
      home_player1_id: playerAlice.id,
      home_player2_id: playerBob.id,
      away_player1_id: playerClara.id,
      away_player2_id: playerDavid.id,
      winner1_id: playerAlice.id,
      winner2_id: playerBob.id,
    },
  ])
}
