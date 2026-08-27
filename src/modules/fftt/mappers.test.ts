import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getGameWinner,
  lineupPosition,
  mapFfttClub,
  mapFfttPlayer,
  splitGameLabel,
} from './mappers.js'
import type { FfttGame, FfttLicense } from './models.js'

const game: FfttGame = {
  homePlayerLabel: 'MARTIN Alice',
  awayPlayerLabel: 'DURAND Bob',
}

test('mapFfttClub maps the external club identity fields', () => {
  assert.deepEqual(
    mapFfttClub({
      externalId: '123',
      number: '44123456',
      name: 'Mellinet TT',
    }),
    {
      ffttId: '123',
      name: 'Mellinet TT',
      numero: '44123456',
    }
  )
})

test('mapFfttPlayer maps a license to the local player model', () => {
  const player: FfttLicense = {
    externalId: '456',
    licenseNumber: '4412345678',
    firstName: 'Alice',
    lastName: 'Martin',
    clubNumber: '44123456',
    clubName: 'Mellinet TT',
    points: 1250,
  }

  assert.deepEqual(mapFfttPlayer(player, 'club-uuid'), {
    firstName: 'Alice',
    lastName: 'Martin',
    points: 1250,
    clubId: 'club-uuid',
    ffttId: '456',
  })
})

test('mapFfttPlayer rejects a player without points', () => {
  assert.throws(
    () =>
      mapFfttPlayer(
        {
          externalId: '456',
          licenseNumber: '4412345678',
          firstName: 'Alice',
          lastName: 'Martin',
          clubNumber: '44123456',
          clubName: 'Mellinet TT',
        },
        'club-uuid'
      ),
    /No points found for FFTT player 4412345678/
  )
})

test('splitGameLabel keeps a single name untouched', () => {
  assert.deepEqual(splitGameLabel('MARTIN Alice'), ['MARTIN Alice'])
})

test('splitGameLabel splits the two players of a double', () => {
  assert.deepEqual(splitGameLabel('MARTIN Alice - BERNARD Chloé'), [
    'MARTIN Alice',
    'BERNARD Chloé',
  ])
  assert.deepEqual(splitGameLabel('MARTIN Alice/BERNARD Chloé'), [
    'MARTIN Alice',
    'BERNARD Chloé',
  ])
})

test('splitGameLabel leaves a composed name alone', () => {
  assert.deepEqual(splitGameLabel('DUPONT Jean-Pierre'), ['DUPONT Jean-Pierre'])
})

test('getGameWinner reads the winner from the sets', () => {
  assert.equal(getGameWinner({ ...game, homeScore: 3, awayScore: 1 }), 'home')
  assert.equal(getGameWinner({ ...game, homeScore: 2, awayScore: 3 }), 'away')
})

test('getGameWinner stays unknown when the game was not played', () => {
  assert.equal(getGameWinner(game), undefined)
  assert.equal(
    getGameWinner({ ...game, homeScore: 0, awayScore: 0 }),
    undefined
  )
})

test('lineupPosition names the slots of each side', () => {
  assert.equal(lineupPosition('home', 0), 'A')
  assert.equal(lineupPosition('home', 3), 'D')
  assert.equal(lineupPosition('away', 0), 'W')
  assert.equal(lineupPosition('away', 3), 'Z')
  assert.equal(lineupPosition('home', 4), undefined)
})
