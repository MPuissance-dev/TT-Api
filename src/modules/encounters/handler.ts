import type { FastifyReply, FastifyRequest } from 'fastify'
import type { components } from '../../types/api.js'
import { mapEncounter } from './mapper.js'
import { type AppServices, services } from '../../services.js'

type SearchEncountersRequest = FastifyRequest<{
  Body: components['schemas']['EncounterSearchRequest']
}>

export const createSearchEncountersHandler = (
  appServices: AppServices = services
) => {
  return async (request: SearchEncountersRequest, reply: FastifyReply) => {
    const { dayNumber, season, phase } = request.body
    const rows = await appServices.encounters.searchEncounters({
      dayNumber,
      season,
      phase,
    })

    return reply.send(
      rows.map((row) => mapEncounter(row, appServices.followedClubNumber))
    )
  }
}
