import type { FastifyPluginAsync } from 'fastify'
import { createGetPlayerHandler } from './handler.js'
import { type AppServices, services } from '../../services.js'

export const createPlayersRouter = (
  appServices: AppServices = services
): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.get(
      '/:playerId',
      {
        schema: {
          querystring: {
            type: 'object',
            additionalProperties: false,
            properties: {
              season: { type: 'string', pattern: String.raw`^\d{4}/\d{4}$` },
              phase: { type: 'number', enum: [1, 2] },
            },
          },
        },
      },
      createGetPlayerHandler(appServices)
    )
  }
}
