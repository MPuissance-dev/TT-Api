import type { FastifyPluginAsync } from 'fastify'
import {
  createEncountersPosterHandler,
  createEncountersPosterPreviewHandler,
} from './handler.js'
import { imageFormatNames } from './formats.js'
import { type AppServices, services } from '../../services.js'

const posterProperties = {
  dayNumber: { type: 'number' },
  season: { type: 'string', pattern: String.raw`^\d{4}/\d{4}$` },
  phase: { type: 'number', enum: [1, 2] },
  category: { type: 'string', enum: ['senior', 'youth', 'veteran'] },
  format: { type: 'string', enum: imageFormatNames },
  title: { type: 'string', maxLength: 80 },
  subtitle: { type: 'string', maxLength: 120 },
} as const

export const createGraphicsRouter = (
  appServices: AppServices = services
): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.post(
      '/encounters-poster',
      {
        schema: {
          body: {
            type: 'object',
            additionalProperties: false,
            properties: posterProperties,
          },
        },
      },
      createEncountersPosterHandler(appServices)
    )

    fastify.get(
      '/encounters-poster/preview',
      {
        schema: {
          querystring: {
            type: 'object',
            additionalProperties: false,
            properties: posterProperties,
          },
        },
      },
      createEncountersPosterPreviewHandler(appServices)
    )
  }
}
