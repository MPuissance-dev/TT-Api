import type { FastifyPluginAsync } from 'fastify'
import { createGetTeamHandler } from './handler.js'
import { type AppServices, services } from '../../services.js'

export const createTeamsRouter = (
  appServices: AppServices = services
): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.get(
      '/:teamId',
      {
        schema: {
          querystring: {
            type: 'object',
            additionalProperties: false,
            properties: {
              season: { type: 'string', pattern: String.raw`^\d{4}/\d{4}$` },
              phase: { type: 'number', enum: [1, 2] },
              category: {
                type: 'string',
                enum: ['senior', 'youth', 'veteran'],
              },
            },
          },
        },
      },
      createGetTeamHandler(appServices)
    )
  }
}
