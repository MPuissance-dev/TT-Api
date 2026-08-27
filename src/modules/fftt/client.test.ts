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

test('listPools extracts the pool identifier from the result link', async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = async () =>
    new Response(`
      <liste>
        <poule>
          <libelle>Poule A</libelle>
          <lien>https://www.fftt.com/mobile/pxml/xml_result_equ.php?action=classement&amp;auto=1&amp;D1=6789&amp;cx_poule=112233</lien>
        </poule>
      </liste>
    `)

  try {
    const pools = await createFfttClient({
      applicationCode: 'A001',
      password: 'password',
      serie: 'ABCDEFGHIJKLMNO',
    }).listPools('6789')

    assert.equal(pools.length, 1)
    assert.equal(pools[0]?.externalId, '112233')
    assert.equal(pools[0]?.divisionExternalId, '6789')
    assert.ok(
      (pools[0]?.externalId.length ?? 0) <= 32,
      'the identifier must fit the pools.fftt_id column'
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

const rosterResponse = () =>
  new Response(`
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

const testClient = (overrides: Record<string, unknown> = {}) =>
  createFfttClient({
    applicationCode: 'A001',
    password: 'password',
    serie: 'ABCDEFGHIJKLMNO',
    endpoint: 'https://example.test/players',
    retryDelayMs: 0,
    sleep: async () => {},
    ...overrides,
  })

test('a temporary FFTT failure is retried', async () => {
  const originalFetch = globalThis.fetch
  let attempts = 0

  globalThis.fetch = async () => {
    attempts += 1
    return attempts < 3 ? new Response('', { status: 503 }) : rosterResponse()
  }

  try {
    const players = await testClient().listPlayersByClub('44123456')

    assert.equal(attempts, 3)
    assert.equal(players.length, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('a rejected FFTT request is not retried', async () => {
  const originalFetch = globalThis.fetch
  let attempts = 0

  globalThis.fetch = async () => {
    attempts += 1
    return new Response('', { status: 403 })
  }

  try {
    await assert.rejects(
      () => testClient().listPlayersByClub('44123456'),
      /status 403/
    )
    assert.equal(attempts, 1, 'a refused request will never succeed')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('a functional FFTT error is not retried', async () => {
  const originalFetch = globalThis.fetch
  let attempts = 0

  globalThis.fetch = async () => {
    attempts += 1
    return new Response('<erreur>Numero de club inconnu</erreur>')
  }

  try {
    await assert.rejects(
      () => testClient().listPlayersByClub('00000000'),
      /returned an error/
    )
    assert.equal(attempts, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('a new signature is computed for every attempt', async () => {
  const originalFetch = globalThis.fetch
  const timestamps: (string | null)[] = []

  globalThis.fetch = async (input) => {
    timestamps.push(new URL(String(input)).searchParams.get('tm'))
    return timestamps.length < 2
      ? new Response('', { status: 500 })
      : rosterResponse()
  }

  try {
    await testClient({
      sleep: async () => new Promise((resolve) => setTimeout(resolve, 5)),
    }).listPlayersByClub('44123456')

    assert.equal(timestamps.length, 2)
    assert.notEqual(
      timestamps[0],
      timestamps[1],
      'the FFTT rejects a replayed timestamp'
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('the FFTT is never asked more than the configured number of requests at once', async () => {
  const originalFetch = globalThis.fetch
  let running = 0
  let peak = 0

  globalThis.fetch = async () => {
    running += 1
    peak = Math.max(peak, running)
    await new Promise((resolve) => setTimeout(resolve, 5))
    running -= 1
    return rosterResponse()
  }

  try {
    const client = testClient({ maxConcurrentRequests: 2 })
    await Promise.all(
      Array.from({ length: 6 }, () => client.listPlayersByClub('44123456'))
    )

    assert.equal(peak, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})
