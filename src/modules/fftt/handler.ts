import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AppServices } from '../../services.js'
import type { ChampionshipPhase } from '../seasons/season.js'

type SynchronizationRequest = FastifyRequest<{
  Body: {
    clubNumber?: string
    verifyAccess?: boolean
    season?: string
    phase?: ChampionshipPhase
    force?: boolean
  }
}>

type EncounterSynchronizationRequest = FastifyRequest<{
  Params: { encounterId: string }
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
      ...(request.body.force === undefined
        ? {}
        : { force: request.body.force }),
    })

    return reply.send(summary)
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const createEncounterSynchronizationHandler = (
  appServices: AppServices
) => {
  return async (
    request: EncounterSynchronizationRequest,
    reply: FastifyReply
  ) => {
    // Anything but a UUID names no encounter, and would make PostgreSQL fail.
    if (!uuidPattern.test(request.params.encounterId)) {
      return reply.status(404).send({ error: 'Encounter not found' })
    }

    const summary = await appServices.ffttSynchronization.synchronizeEncounter(
      request.params.encounterId
    )
    if (summary === undefined) {
      return reply.status(404).send({ error: 'Encounter not found' })
    }

    return reply.send(summary)
  }
}
