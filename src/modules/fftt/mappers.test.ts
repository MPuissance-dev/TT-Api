import assert from 'node:assert/strict'
import test from 'node:test'
import { mapFfttClub, mapFfttPlayer } from './mappers.js'
import type { FfttLicense } from './models.js'

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
