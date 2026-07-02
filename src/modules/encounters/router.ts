import type { FastifyPluginAsync } from 'fastify'
import { createSearchEncountersHandler } from './handler.js'
import { type AppServices, services } from '../../services.js'

export const createEncountersRouter = (
  appServices: AppServices = services
): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.post(
      '/encounters-search',
      createSearchEncountersHandler(appServices)
    )
  }
}
