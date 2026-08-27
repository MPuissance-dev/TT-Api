import assert from 'node:assert/strict'
import test, { before, beforeEach, after } from 'node:test'
import { asc, eq } from 'drizzle-orm'
import { createTestDatabase } from '../../db/testing/test-database.js'
import {
  clubs,
  divisions,
  seasons,
  encounter_lineup,
  encounter_matches,
  encounters,
  players,
  pool_team,
  team_ranking,
  pools,
  teams,
} from '../../db/schemas/index.js'
import { createFfttSynchronizer } from './synchronizer.js'
import { createFakeFfttClient } from './testing/fake-client.js'
import {
  buildScenario,
  mainClubNumber,
  opponentClubNumber,
  poolId,
  thirdClubNumber,
} from './testing/scenario.js'

const testDatabase = createTestDatabase()
const { database } = testDatabase

const defaultSeason = '2025/2026'

const synchronize = async (
  scenario = buildScenario(),
  season = defaultSeason
) => {
  const fake = createFakeFfttClient(scenario)
  const synchronizer = createFfttSynchronizer(fake.client, database, () => {})
  const summary = await synchronizer.synchronizeClub({
    clubNumber: mainClubNumber,
    season,
  })
  return { summary, fake }
}

before(async () => {
  await testDatabase.truncate()
})

beforeEach(async () => {
  await testDatabase.truncate()
})

after(async () => {
  await testDatabase.close()
})

test('rejects a club number that is not numeric', async () => {
  const fake = createFakeFfttClient(buildScenario())
  const synchronizer = createFfttSynchronizer(fake.client, database, () => {})

  await assert.rejects(
    () => synchronizer.synchronizeClub({ clubNumber: '44A123' }),
    /must contain only digits/
  )
})

test('persists the club, its opponents and their teams', async () => {
  await synchronize()

  const storedClubs = await database
    .select()
    .from(clubs)
    .orderBy(asc(clubs.numero))
  assert.deepEqual(
    storedClubs.map((club) => club.numero),
    [thirdClubNumber, mainClubNumber, opponentClubNumber].sort()
  )

  const storedTeams = await database.select().from(teams)
  assert.equal(storedTeams.length, 3)
  assert.deepEqual(storedTeams.map((team) => team.ffttId).sort(), [
    '111',
    '222',
    '333',
  ])
})

test('stores the pool FFTT identifier and not the whole result link', async () => {
  await synchronize()

  const storedPools = await database.select().from(pools)
  assert.equal(
    storedPools.length,
    1,
    'only the pool the club plays in should be persisted'
  )
  assert.equal(storedPools[0]?.ffttId, poolId)
  assert.equal(storedPools[0]?.name, 'Poule A')
})

test('persists only the encounters involving the club', async () => {
  await synchronize()

  const storedEncounters = await database
    .select()
    .from(encounters)
    .orderBy(asc(encounters.championship_day_number))

  assert.deepEqual(
    storedEncounters.map((encounter) => encounter.championship_day_number),
    [1, 2, 3]
  )
})

test('keeps the announced calendar day when converting FFTT dates', async () => {
  await synchronize()

  const storedEncounters = await database
    .select()
    .from(encounters)
    .orderBy(asc(encounters.championship_day_number))

  assert.deepEqual(
    storedEncounters.map((encounter) =>
      encounter.played_at.toISOString().slice(0, 10)
    ),
    ['2025-09-13', '2025-09-27', '2025-10-18']
  )
})

test('derives the encounter status from the scores and the reschedule', async () => {
  await synchronize()

  const storedEncounters = await database
    .select()
    .from(encounters)
    .orderBy(asc(encounters.championship_day_number))

  assert.deepEqual(
    storedEncounters.map((encounter) => encounter.status),
    ['played', 'scheduled', 'reported']
  )
})

test('updates a rescheduled encounter instead of duplicating it', async () => {
  await synchronize()

  const rescheduled = buildScenario()
  const poolEncounters = rescheduled.encountersByPool?.[`6789:${poolId}`]
  assert.ok(poolEncounters !== undefined)
  const firstEncounter = poolEncounters[0]
  assert.ok(firstEncounter !== undefined)
  firstEncounter.plannedDate = '20/09/2025'
  firstEncounter.actualDate = '20/09/2025'

  await synchronize(rescheduled)

  const storedEncounters = await database
    .select()
    .from(encounters)
    .orderBy(asc(encounters.championship_day_number))

  assert.equal(
    storedEncounters.length,
    3,
    'the rescheduled encounter must be updated, not duplicated'
  )
  assert.equal(
    storedEncounters[0]?.played_at.toISOString().slice(0, 10),
    '2025-09-20'
  )
})

test('updates a scheduled encounter when its result is published', async () => {
  const scheduled = buildScenario()
  const scheduledPool = scheduled.encountersByPool?.[`6789:${poolId}`]
  assert.ok(scheduledPool !== undefined)
  const pending = scheduledPool[0]
  assert.ok(pending !== undefined)
  // Before the match is played the FFTT publishes neither a score nor a result sheet.
  delete pending.homeScore
  delete pending.awayScore
  delete pending.detailsLink

  await synchronize(scheduled)

  const beforeResult = await database.select().from(encounters)
  assert.equal(beforeResult.length, 3)
  assert.equal(
    beforeResult.find((row) => row.championship_day_number === 1)?.status,
    'scheduled'
  )

  await synchronize()

  const afterResult = await database
    .select()
    .from(encounters)
    .orderBy(asc(encounters.championship_day_number))

  assert.equal(
    afterResult.length,
    3,
    'publishing the result must not create a second encounter'
  )
  assert.equal(afterResult[0]?.status, 'played')
  assert.equal(afterResult[0]?.home_score, 14)
  assert.equal(afterResult[0]?.away_score, 6)
})

test('is idempotent across repeated synchronizations', async () => {
  await synchronize()
  await synchronize()

  const [
    storedClubs,
    storedTeams,
    storedPools,
    storedEncounters,
    storedLineups,
  ] = await Promise.all([
    database.select().from(clubs),
    database.select().from(teams),
    database.select().from(pools),
    database.select().from(encounters),
    database.select().from(encounter_lineup),
  ])

  assert.equal(storedClubs.length, 3)
  assert.equal(storedTeams.length, 3)
  assert.equal(storedPools.length, 1)
  assert.equal(storedEncounters.length, 3)
  assert.equal(storedLineups.length, 3)
})

test('attaches every player to their own club', async () => {
  await synchronize()

  const storedClubs = await database.select().from(clubs)
  const clubIdByNumber = new Map(
    storedClubs.map((club) => [club.numero, club.id])
  )
  const storedPlayers = await database.select().from(players)

  const byLicense = new Map(
    storedPlayers.map((player) => [player.ffttId, player])
  )
  assert.equal(byLicense.get('L1')?.clubId, clubIdByNumber.get(mainClubNumber))
  assert.equal(
    byLicense.get('L3')?.clubId,
    clubIdByNumber.get(opponentClubNumber)
  )
})

test('downloads a club roster only when a result sheet needs it', async () => {
  const { fake } = await synchronize()

  assert.deepEqual(
    fake.calls.filter((call) => call.startsWith('listLicensesByClub')),
    [
      `listLicensesByClub:${mainClubNumber}`,
      `listLicensesByClub:${opponentClubNumber}`,
    ],
    'only the club itself and the opponent of the published result sheet'
  )

  const storedPlayers = await database.select().from(players)
  assert.equal(
    storedPlayers.some((player) => player.ffttId === 'L4'),
    false,
    'Nantes ASPTT has not been faced yet, its roster is not downloaded'
  )
})

test('downloads a club roster at most once per synchronization', async () => {
  const scenario = buildScenario()
  const poolEncounters = scenario.encountersByPool?.[`6789:${poolId}`]
  assert.ok(poolEncounters !== undefined)
  // Two published result sheets, both involving Nantes ASPTT.
  const published = poolEncounters[0]
  assert.ok(published !== undefined)
  const publishedLink = published.detailsLink
  assert.ok(publishedLink !== undefined)
  for (const pending of poolEncounters.slice(2)) {
    pending.detailsLink = publishedLink
  }

  const { fake } = await synchronize(scenario)

  const rosterCalls = fake.calls.filter((call) =>
    call.startsWith('listLicensesByClub')
  )
  assert.equal(
    rosterCalls.length,
    new Set(rosterCalls).size,
    'no club roster must be downloaded twice'
  )
  assert.equal(rosterCalls.length, 3)
})

test('records the lineup of both teams and reports the players it could not match', async () => {
  const { summary } = await synchronize()

  const storedLineups = await database.select().from(encounter_lineup)
  assert.equal(storedLineups.length, 3)

  assert.equal(summary.lineups, 3)
  assert.equal(
    summary.unmatchedPlayers,
    1,
    'INCONNU Xavier has no license and must be reported'
  )
})

test('reports accurate entity counts in the summary', async () => {
  const { summary } = await synchronize()

  assert.equal(summary.clubs, 3)
  assert.equal(summary.teams, 3)
  assert.equal(summary.players, 3)
  assert.equal(summary.divisions, 1)
  assert.equal(summary.pools, 1)
  assert.equal(summary.encounters, 3)
  assert.equal(summary.skippedEncounters, 0)
})

test('fails when the FFTT application is not authorized', async () => {
  const scenario = buildScenario()
  scenario.initialization = {
    applicationAuthorized: false,
    message: 'Application suspendue',
  }
  const fake = createFakeFfttClient(scenario)
  const synchronizer = createFfttSynchronizer(fake.client, database, () => {})

  await assert.rejects(
    () =>
      synchronizer.synchronizeClub({
        clubNumber: mainClubNumber,
        verifyAccess: true,
      }),
    /Application suspendue/
  )
})

test('fails when the club is unknown to the FFTT', async () => {
  const scenario = buildScenario()
  scenario.clubs = []
  const fake = createFakeFfttClient(scenario)
  const synchronizer = createFfttSynchronizer(fake.client, database, () => {})

  await assert.rejects(
    () => synchronizer.synchronizeClub({ clubNumber: mainClubNumber }),
    /FFTT club not found/
  )
})

test('matches player names whatever the order FFTT uses', async () => {
  const scenario = buildScenario()
  const details = scenario.encounterDetails?.['987654']
  assert.ok(details !== undefined)
  details.players = [
    // FFTT alternates between `NOM Prenom` and `Prenom NOM`, and composed names vary in order.
    { homePlayerLabel: 'Alice MARTIN', awayPlayerLabel: 'Bob DURAND' },
    { homePlayerLabel: 'Chloé BERNARD', awayPlayerLabel: 'INCONNU Xavier' },
  ]

  const { summary } = await synchronize(scenario)

  assert.equal(summary.lineups, 3)
  assert.equal(summary.unmatchedPlayers, 1)
})

test('does not create an encounter when the FFTT date is unusable', async () => {
  const scenario = buildScenario()
  const poolEncounters = scenario.encountersByPool?.[`6789:${poolId}`]
  assert.ok(poolEncounters !== undefined)
  const pending = poolEncounters[2]
  assert.ok(pending !== undefined)
  pending.plannedDate = '32/13/2025'
  delete pending.actualDate

  const { summary } = await synchronize(scenario)

  assert.equal(summary.encounters, 2)
  assert.equal(summary.skippedEncounters, 1)
  assert.equal(summary.skippedEncounterReasons.missingDate, 1)
})

test('stores the team labels and their rank inside the club', async () => {
  await synchronize()

  const storedTeams = await database
    .select()
    .from(teams)
    .orderBy(asc(teams.name))

  assert.deepEqual(
    storedTeams.map((team) => ({ name: team.name, number: team.number })),
    [
      { name: 'Mellinet TT 1', number: 1 },
      { name: 'Nantes ASPTT 3', number: 3 },
      { name: 'St Herblain TT 2', number: 2 },
    ]
  )
})

test('splits the division label into a name, a level and a phase', async () => {
  await synchronize()

  const [division] = await database.select().from(divisions)
  assert.equal(division?.name, 'Départementale 1')
  assert.equal(division?.level, 'Départementale')
  assert.equal(division?.phase, 1)
})

test('keeps each season separate instead of overwriting the previous one', async () => {
  await synchronize(buildScenario(), '2024/2025')
  await synchronize(buildScenario(), '2025/2026')

  const storedSeasons = await database
    .select()
    .from(seasons)
    .orderBy(asc(seasons.name))
  assert.deepEqual(
    storedSeasons.map((season) => season.name),
    ['2024/2025', '2025/2026']
  )

  const storedDivisions = await database.select().from(divisions)
  assert.equal(
    storedDivisions.length,
    2,
    'the same FFTT division must exist once per season'
  )

  const storedPools = await database.select().from(pools)
  assert.equal(storedPools.length, 2)

  const storedEncounters = await database.select().from(encounters)
  assert.equal(
    storedEncounters.length,
    6,
    'each season keeps its own encounters'
  )

  const storedTeams = await database.select().from(teams)
  assert.equal(
    storedTeams.length,
    3,
    'a team keeps a single identity across seasons'
  )
})

test('rejects a malformed season label', async () => {
  const fake = createFakeFfttClient(buildScenario())
  const synchronizer = createFfttSynchronizer(fake.client, database, () => {})

  await assert.rejects(
    () =>
      synchronizer.synchronizeClub({
        clubNumber: mainClubNumber,
        season: '2025-2026',
      }),
    /Expected the 2025\/2026 format/
  )
})

test('fills the lineup of an encounter that was still scheduled', async () => {
  const scheduled = buildScenario()
  const scheduledPool = scheduled.encountersByPool?.[`6789:${poolId}`]
  assert.ok(scheduledPool !== undefined)
  const pending = scheduledPool[0]
  assert.ok(pending !== undefined)
  delete pending.homeScore
  delete pending.awayScore
  delete pending.detailsLink

  await synchronize(scheduled)
  assert.equal(
    (await database.select().from(encounter_lineup)).length,
    0,
    'an encounter that is not played yet has no lineup'
  )

  const { summary } = await synchronize()

  const storedLineups = await database.select().from(encounter_lineup)
  assert.equal(storedLineups.length, 3)
  assert.equal(summary.lineups, 3)
})

test('replaces the lineup when the FFTT corrects the result sheet', async () => {
  await synchronize()

  const storedPlayers = await database.select().from(players)
  const playerIdByLicense = new Map(
    storedPlayers.map((player) => [player.ffttId, player.id])
  )

  const corrected = buildScenario()
  const details = corrected.encounterDetails?.['987654']
  assert.ok(details !== undefined)
  details.players = [
    { homePlayerLabel: 'BERNARD Chloé', awayPlayerLabel: 'DURAND Bob' },
  ]

  await synchronize(corrected)

  const storedLineups = await database.select().from(encounter_lineup)
  assert.equal(
    storedLineups.length,
    2,
    'a player removed from the result sheet must leave the lineup'
  )
  assert.equal(
    storedLineups.some(
      (lineup) => lineup.player_id === playerIdByLicense.get('L1')
    ),
    false,
    'Alice Martin no longer plays this encounter'
  )
})

test('keeps the stored lineup when the FFTT stops publishing the result sheet', async () => {
  await synchronize()

  const withoutSheet = buildScenario()
  const poolEncounters = withoutSheet.encountersByPool?.[`6789:${poolId}`]
  assert.ok(poolEncounters !== undefined)
  const played = poolEncounters[0]
  assert.ok(played !== undefined)
  delete played.detailsLink

  await synchronize(withoutSheet)

  assert.equal(
    (await database.select().from(encounter_lineup)).length,
    3,
    'a missing result sheet must not erase what was already recorded'
  )
})

test('records each player under the team they played for', async () => {
  await synchronize()

  const storedPlayers = await database.select().from(players)
  const playerIdByLicense = new Map(
    storedPlayers.map((player) => [player.ffttId, player.id])
  )
  const storedTeams = await database.select().from(teams)
  const teamIdByName = new Map(
    storedTeams.map((team) => [team.normalizedName, team.id])
  )

  const storedLineups = await database.select().from(encounter_lineup)
  const teamIdByPlayer = new Map(
    storedLineups.map((lineup) => [lineup.player_id, lineup.team_id])
  )

  assert.equal(
    teamIdByPlayer.get(playerIdByLicense.get('L1') ?? ''),
    teamIdByName.get('mellinet tt 1')
  )
  assert.equal(
    teamIdByPlayer.get(playerIdByLicense.get('L3') ?? ''),
    teamIdByName.get('st herblain tt 2')
  )
})

test('refreshes the points of a player between two synchronizations', async () => {
  await synchronize()

  const promoted = buildScenario()
  const roster = promoted.licensesByClub?.[mainClubNumber]
  assert.ok(roster !== undefined)
  const alice = roster[0]
  assert.ok(alice !== undefined)
  alice.points = 1380

  await synchronize(promoted)

  const storedPlayers = await database.select().from(players)
  assert.equal(
    storedPlayers.find((player) => player.ffttId === 'L1')?.points,
    1380
  )
  assert.equal(storedPlayers.length, 3, 'the player must not be duplicated')
})

test('detaches a team that left the pool', async () => {
  await synchronize()
  assert.equal((await database.select().from(pool_team)).length, 3)

  const shrunk = buildScenario()
  const rankings = shrunk.rankingsByPool?.[`6789:${poolId}`]
  assert.ok(rankings !== undefined)
  shrunk.rankingsByPool![`6789:${poolId}`] = rankings.slice(0, 2)

  await synchronize(shrunk)

  assert.equal(
    (await database.select().from(pool_team)).length,
    2,
    'a withdrawn team must not stay attached to the pool'
  )
})

test('still records the encounter when its result sheet cannot be read', async () => {
  const unreachableSheet = buildScenario()
  delete unreachableSheet.encounterDetails

  const { summary } = await synchronize(unreachableSheet)

  const storedEncounters = await database
    .select()
    .from(encounters)
    .orderBy(asc(encounters.championship_day_number))
  assert.equal(storedEncounters.length, 3)
  assert.equal(storedEncounters[0]?.status, 'played')
  assert.equal(storedEncounters[0]?.home_score, 14)
  assert.equal(summary.lineups, 0)
})

const encounterMatchesOfFirstDay = async () => {
  const storedEncounters = await database
    .select()
    .from(encounters)
    .orderBy(asc(encounters.championship_day_number))
  const first = storedEncounters[0]
  assert.ok(first !== undefined)

  return database
    .select()
    .from(encounter_matches)
    .where(eq(encounter_matches.encounter_id, first.id))
    .orderBy(asc(encounter_matches.number))
}

test('records every game of a result sheet with its score and its sets', async () => {
  const { summary } = await synchronize()

  const matches = await encounterMatchesOfFirstDay()
  assert.equal(matches.length, 4)
  assert.equal(summary.matches, 4)

  const first = matches[0]
  assert.equal(first?.type, 'single')
  assert.equal(first?.home_score, 3)
  assert.equal(first?.away_score, 1)
  assert.equal(first?.winner, 'home')
  assert.equal(first?.set_details, '11/9 8/11 11/5 11/7')

  assert.equal(matches[1]?.winner, 'away')
})

test('records a double as a single game holding two players per side', async () => {
  await synchronize()

  const storedPlayers = await database.select().from(players)
  const idOf = (license: string) =>
    storedPlayers.find((player) => player.ffttId === license)?.id

  const double = (await encounterMatchesOfFirstDay())[2]
  assert.equal(double?.type, 'double')
  assert.equal(double?.home_player_id, idOf('L1'))
  assert.equal(double?.home_player2_id, idOf('L2'))
  assert.equal(double?.away_player_id, idOf('L3'))
  assert.equal(
    double?.away_player2_id,
    null,
    'an unlicensed opponent leaves the slot empty'
  )
})

test('leaves the winner unknown for a game that was not played', async () => {
  await synchronize()

  const forfeit = (await encounterMatchesOfFirstDay())[3]
  assert.equal(forfeit?.winner, null)
  assert.equal(forfeit?.home_score, null)
  assert.equal(forfeit?.away_score, null)
})

test('replaces the games when the FFTT corrects the result sheet', async () => {
  await synchronize()
  assert.equal((await encounterMatchesOfFirstDay()).length, 4)

  const corrected = buildScenario()
  const details = corrected.encounterDetails?.['987654']
  assert.ok(details !== undefined)
  details.games = details.games.slice(0, 2)
  const firstGame = details.games[0]
  assert.ok(firstGame !== undefined)
  firstGame.homeScore = 1
  firstGame.awayScore = 3

  await synchronize(corrected)

  const matches = await encounterMatchesOfFirstDay()
  assert.equal(matches.length, 2, 'the removed games must not linger')
  assert.equal(matches[0]?.winner, 'away', 'the corrected score must win')
})

test('does not duplicate the games across synchronizations', async () => {
  await synchronize()
  await synchronize()

  assert.equal((await database.select().from(encounter_matches)).length, 4)
})

test('records the standings of a pool with their tie breakers', async () => {
  const { summary } = await synchronize()

  const storedTeams = await database.select().from(teams)
  const mellinet = storedTeams.find(
    (team) => team.normalizedName === 'mellinet tt 1'
  )
  const standings = await database.select().from(team_ranking)

  assert.equal(standings.length, 3)
  assert.equal(summary.rankings, 3)

  const leader = standings.find((row) => row.team_id === mellinet?.id)
  assert.equal(leader?.rank, 1)
  assert.equal(leader?.points, 3)
  assert.equal(leader?.played, 1)
  assert.equal(leader?.wins, 1)
  assert.equal(leader?.losses, 0)
  assert.equal(leader?.games_won, 14)
  assert.equal(leader?.games_lost, 6)
})

test('refreshes the standings instead of piling them up', async () => {
  await synchronize()

  const nextDay = buildScenario()
  const rankings = nextDay.rankingsByPool?.[`6789:${poolId}`]
  assert.ok(rankings !== undefined)
  const leader = rankings[0]
  assert.ok(leader !== undefined)
  leader.matchPoints = 6
  leader.matchesPlayed = 2
  leader.wins = 2

  await synchronize(nextDay)

  const standings = await database.select().from(team_ranking)
  assert.equal(standings.length, 3)
  assert.equal(
    standings.find((row) => row.points === 6)?.wins,
    2,
    'the standings of the pool must be updated in place'
  )
})

test('records the slot of every player on the result sheet', async () => {
  await synchronize()

  const storedPlayers = await database.select().from(players)
  const idOf = (license: string) =>
    storedPlayers.find((player) => player.ffttId === license)?.id

  const lineups = await database.select().from(encounter_lineup)
  const positionOf = (playerId: string | undefined) =>
    lineups.find((lineup) => lineup.player_id === playerId)?.position

  assert.equal(positionOf(idOf('L1')), 'A')
  assert.equal(positionOf(idOf('L3')), 'W')
  assert.equal(positionOf(idOf('L2')), 'B')
})
