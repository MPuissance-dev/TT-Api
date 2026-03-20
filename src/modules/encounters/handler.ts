import { type SearchEncounterRow, searchEncounters } from './db.js'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { components } from '../../types/api.js'
import { mapEncounter } from './mapper.js'

type SearchEncountersRequest = FastifyRequest<{
  Body: components['schemas']['EncounterSearchRequest']
}>

export const searchEncountersHandler = async (request: SearchEncountersRequest, reply: FastifyReply) => {
  const { dayNumber } = request.body
  try {
    const rows = (await searchEncounters(dayNumber)) as SearchEncounterRow[]
    const encounters = rows.map((row) => mapEncounter(row))
    reply.send(encounters)
  } catch (error) {
    console.error('Error fetching encounters:', error)
    reply.status(500).send({ error: 'Failed to fetch encounters' })
  }
}
