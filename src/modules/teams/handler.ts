import type { FastifyReply, FastifyRequest } from 'fastify'
import type { operations } from '../../types/api.js'
import { mapTeamDetails } from './mapper.js'
import { phaseFromDate, seasonNameFromDate } from '../seasons/season.js'
import { type AppServices, services } from '../../services.js'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type GetTeamRequest = FastifyRequest<{
  Params: operations['getTeam']['parameters']['path']
  Querystring: NonNullable<operations['getTeam']['parameters']['query']>
}>

export const createGetTeamHandler = (appServices: AppServices = services) => {
  return async (request: GetTeamRequest, reply: FastifyReply) => {
    const { teamId } = request.params
    const criteria = {
      season: request.query.season ?? seasonNameFromDate(),
      phase: request.query.phase ?? phaseFromDate(),
      category: request.query.category ?? 'senior',
    }

    // Anything but a UUID names no team, and would make PostgreSQL fail.
    const details = uuidPattern.test(teamId)
      ? await appServices.teams.findTeamDetails(teamId, criteria)
      : undefined
    if (details === undefined) {
      return reply.code(404).send({ message: 'Team not found' })
    }

    return reply.send(mapTeamDetails(details, criteria))
  }
}
