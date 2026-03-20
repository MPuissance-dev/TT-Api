import type { FastifyInstance } from 'fastify'
import { searchEncountersHandler } from './handler.js'

export const encountersRouter = (fastify : FastifyInstance) => {
  fastify.post('/encounters-search', searchEncountersHandler)
}
