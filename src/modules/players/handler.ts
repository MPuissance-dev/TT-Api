import type { FastifyReply, FastifyRequest } from 'fastify'
import type { operations } from '../../types/api.js'
import { mapPlayerDetails } from './mapper.js'
import { phaseFromDate, seasonNameFromDate } from '../seasons/season.js'
import { type AppServices, services } from '../../services.js'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type GetPlayerRequest = FastifyRequest<{
  Params: operations['getPlayer']['parameters']['path']
  Querystring: NonNullable<operations['getPlayer']['parameters']['query']>
}>

export const createGetPlayerHandler = (appServices: AppServices = services) => {
  return async (request: GetPlayerRequest, reply: FastifyReply) => {
    const { playerId } = request.params
    const criteria = {
      season: request.query.season ?? seasonNameFromDate(),
      phase: request.query.phase ?? phaseFromDate(),
    }

    // Anything but a UUID names no player, and would make PostgreSQL fail.
    const details = uuidPattern.test(playerId)
      ? await appServices.players.findPlayerDetails(playerId, criteria)
      : undefined
    if (details === undefined) {
      return reply.code(404).send({ message: 'Player not found' })
    }

    return reply.send(mapPlayerDetails(details, criteria))
  }
}
