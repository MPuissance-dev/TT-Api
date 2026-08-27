import type { FastifyPluginAsync } from 'fastify'
import { createSearchEncountersHandler } from './handler.js'
import { type AppServices, services } from '../../services.js'

export const createEncountersRouter = (
  appServices: AppServices = services
): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.post(
      '/encounters-search',
      {
        schema: {
          body: {
            type: 'object',
            additionalProperties: false,
            properties: {
              dayNumber: { type: 'number' },
              season: { type: 'string', pattern: String.raw`^\d{4}/\d{4}$` },
              phase: { type: 'number', enum: [1, 2] },
            },
          },
        },
      },
      createSearchEncountersHandler(appServices)
    )
  }
}
