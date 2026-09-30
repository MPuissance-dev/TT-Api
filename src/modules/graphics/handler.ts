import type { FastifyReply, FastifyRequest } from 'fastify'
import { type AppServices, services } from '../../services.js'
import { resolveImageFormat } from './formats.js'
import { renderEncountersPoster } from './templates/encounters-poster.js'
import { toPosterEncounter } from './view-model.js'
import type { components } from '../../types/api.js'

export type EncountersPosterQuery =
  components['schemas']['EncountersPosterRequest']

type PreviewRequest = FastifyRequest<{ Querystring: EncountersPosterQuery }>

/**
 * Serves the standalone poster document. The web interface displays it and
 * rasterises it to PNG in the browser, so the server never needs a browser.
 */
export const createEncountersPosterPreviewHandler = (
  appServices: AppServices = services
) => {
  return async (request: PreviewRequest, reply: FastifyReply) => {
    const format = resolveImageFormat(request.query.format)
    const rows = await appServices.encounters.searchEncounters({
      dayNumber: request.query.dayNumber,
      season: request.query.season,
      phase: request.query.phase,
      category: request.query.category,
    })

    const html = renderEncountersPoster({
      encounters: rows.map((row) => toPosterEncounter(row)),
      format,
      title: request.query.title,
      subtitle: request.query.subtitle,
      highlightedClubName: appServices.graphics.highlightedClubName,
      highlightedClubNumber: appServices.followedClubNumber,
    })

    return reply.header('content-type', 'text/html; charset=utf-8').send(html)
  }
}
