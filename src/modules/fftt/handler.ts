import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AppServices } from '../../services.js'
import type { ChampionshipPhase } from '../seasons/season.js'

type SynchronizationRequest = FastifyRequest<{
  Body: {
    clubNumber?: string
    verifyAccess?: boolean
    season?: string
    phase?: ChampionshipPhase
  }
}>

export const createSynchronizationHandler = (appServices: AppServices) => {
  return async (request: SynchronizationRequest, reply: FastifyReply) => {
    const clubNumber = request.body.clubNumber ?? appServices.followedClubNumber
    if (clubNumber === undefined) {
      return reply.status(400).send({
        error:
          'A club number is required, either in the request or through FFTT_CLUB_NUMBER',
      })
    }

    const summary = await appServices.ffttSynchronization.synchronizeClub({
      clubNumber,
      ...(request.body.verifyAccess === undefined
        ? {}
        : { verifyAccess: request.body.verifyAccess }),
      ...(request.body.season === undefined
        ? {}
        : { season: request.body.season }),
      ...(request.body.phase === undefined
        ? {}
        : { phase: request.body.phase }),
    })

    return reply.send(summary)
  }
}
