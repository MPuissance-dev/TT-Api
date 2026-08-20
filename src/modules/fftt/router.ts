import type { FastifyPluginAsync } from 'fastify'
import type { AppServices } from '../../services.js'
import { createSynchronizationHandler } from './handler.js'

export const createFfttRouter = (appServices: AppServices): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.post<{ Body: { clubNumber: string; verifyAccess?: boolean } }>(
      '/synchronization',
      {
        schema: {
          body: {
            type: 'object',
            required: ['clubNumber'],
            properties: {
              clubNumber: { type: 'string', pattern: '^\\d+$' },
              verifyAccess: { type: 'boolean', default: false },
            },
            additionalProperties: false,
          },
        },
      },
      createSynchronizationHandler(appServices)
    )
  }
}
