import type { FastifyPluginAsync } from 'fastify'
import type { AppServices } from '../../services.js'
import {
  createEncounterSynchronizationHandler,
  createSynchronizationHandler,
} from './handler.js'

export const createFfttRouter = (
  appServices: AppServices
): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.post(
      '/synchronization',
      {
        schema: {
          body: {
            type: 'object',
            additionalProperties: false,
            properties: {
              clubNumber: { type: 'string', pattern: '^\\d+$' },
              verifyAccess: { type: 'boolean', default: false },
              season: { type: 'string', pattern: '^\\d{4}/\\d{4}$' },
              phase: { type: 'number', enum: [1, 2] },
              force: { type: 'boolean', default: false },
            },
          },
        },
      },
      createSynchronizationHandler(appServices)
    )

    fastify.post(
      '/encounters/:encounterId/synchronization',
      {
        schema: {
          params: {
            type: 'object',
            required: ['encounterId'],
            properties: { encounterId: { type: 'string' } },
          },
        },
      },
      createEncounterSynchronizationHandler(appServices)
    )
  }
}
