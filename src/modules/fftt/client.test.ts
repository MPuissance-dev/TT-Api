import assert from 'node:assert/strict'
import test from 'node:test'
import { createFfttClient } from './client.js'

test('listPlayersByClub requests and maps the FFTT XML response', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''

  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response(`
      <joueurs>
        <joueur>
          <licence>4412345678</licence>
          <nom>Martin</nom>
          <prenom>Alice</prenom>
          <club>44123456</club>
          <nclub>Mellinet TT</nclub>
          <clast>12</clast>
        </joueur>
      </joueurs>
    `)
  }

  try {
    const players = await createFfttClient({
      applicationCode: 'A001',
      password: 'password',
      serie: 'ABCDEFGHIJKLMNO',
      endpoint: 'https://example.test/players',
    }).listPlayersByClub('44123456')

    assert.deepEqual(players, [
      {
        licenseNumber: '4412345678',
        firstName: 'Alice',
        lastName: 'Martin',
        clubName: 'Mellinet TT',
        clubNumber: '44123456',
        ranking: '12',
      },
    ])

    const url = new URL(requestedUrl)
    assert.equal(url.searchParams.get('club'), '44123456')
    assert.equal(url.searchParams.get('id'), 'A001')
  } finally {
    globalThis.fetch = originalFetch
  }
})
