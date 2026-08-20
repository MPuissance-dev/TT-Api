import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AppServices } from '../../services.js'

type SynchronizationRequest = FastifyRequest<{
  Body: {
    clubNumber: string
    verifyAccess?: boolean
  }
}>

export const createSynchronizationHandler = (appServices: AppServices) => {
  return async (request: SynchronizationRequest, reply: FastifyReply) => {
    const summary = await appServices.ffttSynchronization.synchronizeClub({
      clubNumber: request.body.clubNumber,
      ...(request.body.verifyAccess === undefined ? {} : { verifyAccess: request.body.verifyAccess }),
    })
    return reply.send(summary)
  }
}
