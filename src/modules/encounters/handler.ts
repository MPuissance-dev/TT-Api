import type { FastifyReply, FastifyRequest } from 'fastify'
import type { components, operations } from '../../types/api.js'
import { mapEncounter, mapEncounterDetails } from './mapper.js'
import { buildCalendar } from './calendar.js'
import { phaseFromDate, seasonNameFromDate } from '../seasons/season.js'
import { type AppServices, services } from '../../services.js'

type SearchEncountersRequest = FastifyRequest<{
  Body: components['schemas']['EncounterSearchRequest']
}>

export const createSearchEncountersHandler = (
  appServices: AppServices = services
) => {
  return async (request: SearchEncountersRequest, reply: FastifyReply) => {
    const { dayNumber, season, phase, category } = request.body
    const rows = await appServices.encounters.searchEncounters({
      dayNumber,
      season,
      phase,
      category,
    })

    return reply.send(rows.map((row) => mapEncounter(row)))
  }
}

type ChampionshipCalendarRequest = FastifyRequest<{
  Querystring: NonNullable<
    operations['getChampionshipCalendar']['parameters']['query']
  >
}>

export const createChampionshipCalendarHandler = (
  appServices: AppServices = services
) => {
  return async (request: ChampionshipCalendarRequest, reply: FastifyReply) => {
    const criteria = {
      season: request.query.season ?? seasonNameFromDate(),
      phase: request.query.phase ?? phaseFromDate(),
      category: request.query.category ?? 'senior',
    }
    const days = buildCalendar(
      await appServices.encounters.countChampionshipDayDates(criteria)
    )

    const calendar: components['schemas']['ChampionshipCalendar'] = {
      ...criteria,
      days,
    }

    return reply.send(calendar)
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type GetEncounterRequest = FastifyRequest<{
  Params: operations['getEncounter']['parameters']['path']
}>

export const createGetEncounterHandler = (
  appServices: AppServices = services
) => {
  return async (request: GetEncounterRequest, reply: FastifyReply) => {
    const { encounterId } = request.params
    // Anything but a UUID names no encounter, and would make PostgreSQL fail.
    const row = uuidPattern.test(encounterId)
      ? await appServices.encounters.findEncounter(encounterId)
      : undefined
    if (row === undefined) {
      return reply.code(404).send({ message: 'Encounter not found' })
    }

    return reply.send(mapEncounterDetails(row))
  }
}
