import type { FastifyReply, FastifyRequest } from 'fastify'
import { type AppServices, services } from '../../services.js'
import { resolveImageFormat } from './formats.js'
import { renderEncountersPoster } from './templates/encounters-poster.js'
import { toPosterEncounter } from './view-model.js'
import type { components } from '../../types/api.js'

export type EncountersPosterQuery =
  components['schemas']['EncountersPosterRequest']

type PosterRequest = FastifyRequest<{ Body: EncountersPosterQuery }>
type PreviewRequest = FastifyRequest<{ Querystring: EncountersPosterQuery }>

const buildPosterHtml = async (
  appServices: AppServices,
  query: EncountersPosterQuery
) => {
  const format = resolveImageFormat(query.format)
  const rows = await appServices.encounters.searchEncounters({
    dayNumber: query.dayNumber,
    season: query.season,
    phase: query.phase,
    category: query.category,
  })

  const html = renderEncountersPoster({
    encounters: rows.map((row) => toPosterEncounter(row)),
    format,
    title: query.title,
    subtitle: query.subtitle,
    highlightedClubName: appServices.graphics.highlightedClubName,
  })

  return { format, html }
}

export const createEncountersPosterHandler = (
  appServices: AppServices = services
) => {
  return async (request: PosterRequest, reply: FastifyReply) => {
    const { format, html } = await buildPosterHtml(appServices, request.body)
    const png = await appServices.graphics.renderer.toPng(html, format)

    return reply
      .header('content-type', 'image/png')
      .header('content-disposition', `inline; filename="${format.name}.png"`)
      .send(png)
  }
}

/**
 * Serves the very same document the renderer screenshots, so the layout can be
 * iterated on in a real browser without producing an image every time.
 */
export const createEncountersPosterPreviewHandler = (
  appServices: AppServices = services
) => {
  return async (request: PreviewRequest, reply: FastifyReply) => {
    const { html } = await buildPosterHtml(appServices, request.query)

    return reply.header('content-type', 'text/html; charset=utf-8').send(html)
  }
}
