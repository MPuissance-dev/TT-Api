import type { ImageFormat } from '../formats.js'
import { loadEmbeddedFonts, type EmbeddedFonts } from '../fonts.js'
import type { PosterEncounter, PosterTeam } from '../view-model.js'

export interface EncountersPosterInput {
  readonly encounters: PosterEncounter[]
  readonly format: ImageFormat
  /** Defaults to the championship day of the first encounter. */
  readonly title?: string | undefined
  /** Defaults to the season and phase of the first encounter. */
  readonly subtitle?: string | undefined
  /** Club whose teams are visually emphasised. */
  readonly highlightedClubName?: string | undefined
  readonly fonts?: EmbeddedFonts | undefined
}

const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export const escapeHtml = (value: string): string =>
  value.replaceAll(/[&<>"']/g, (character) => htmlEscapes[character]!)

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Paris',
})

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

const formatPlayedAt = (playedAt: string): string => {
  const date = new Date(playedAt)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`
}

const formatScore = (encounter: PosterEncounter): string =>
  encounter.status === 'PLAYED'
    ? `${String(encounter.homeScore ?? 0)} - ${String(encounter.awayScore ?? 0)}`
    : 'VS'

const statusLabels: Record<PosterEncounter['status'], string> = {
  PLAYED: 'Terminé',
  SCHEDULED: 'À venir',
  REPORTED: 'Reporté',
}

const defaultTitle = (encounters: PosterEncounter[]): string => {
  const first = encounters[0]
  return first?.championshipDayNumber == null
    ? 'Rencontres'
    : `Journée ${String(first.championshipDayNumber)}`
}

const defaultSubtitle = (encounters: PosterEncounter[]): string => {
  const first = encounters[0]
  return first === undefined
    ? ''
    : `Saison ${first.season} · Phase ${String(first.phase)}`
}

const renderTeam = (
  team: PosterTeam,
  alignment: 'left' | 'right',
  highlightedClubName: string | undefined,
  compact: boolean
): string => {
  const highlighted =
    highlightedClubName !== undefined && team.clubName === highlightedClubName
  const lineup = compact
    ? ''
    : team.lineup.map((player) => escapeHtml(player.fullName)).join(' · ')

  return `<div class="team ${alignment}${highlighted ? ' highlight' : ''}">
      <div class="team-name">${escapeHtml(team.name)}</div>
      <div class="team-club">${escapeHtml(team.clubName)}</div>
      ${lineup === '' ? '' : `<div class="lineup">${lineup}</div>`}
    </div>`
}

const renderEncounter = (
  encounter: PosterEncounter,
  highlightedClubName: string | undefined,
  compact: boolean
): string =>
  `<article class="card">
    <div class="card-meta">
      <span>${escapeHtml(encounter.division)} · ${escapeHtml(encounter.pool)}</span>
      <span>${escapeHtml(formatPlayedAt(encounter.playedAt))}</span>
    </div>
    <div class="card-body">
      ${renderTeam(encounter.homeTeam, 'left', highlightedClubName, compact)}
      <div class="score-block">
        <div class="score">${escapeHtml(formatScore(encounter))}</div>
        <div class="status">${escapeHtml(statusLabels[encounter.status])}</div>
      </div>
      ${renderTeam(encounter.awayTeam, 'right', highlightedClubName, compact)}
    </div>
  </article>`

const renderEmptyState = (): string =>
  `<div class="empty">Aucune rencontre à afficher</div>`

/**
 * The stylesheet is driven by CSS custom properties so that a single set of
 * rules covers every format: the template only recomputes the scale factors.
 */
const renderStyles = (format: ImageFormat, fonts: EmbeddedFonts): string => {
  // 1080 px wide is the reference design; wider formats scale proportionally.
  const scale = ((format.width / 1080) * format.textScale).toFixed(4)

  return `${fonts.css}
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${String(format.width)}px;
      height: ${String(format.height)}px;
      overflow: hidden;
    }
    body {
      --scale: ${scale};
      --unit: calc(var(--scale) * 1px);
      font-family: ${fonts.fontFamily};
      color: #f8fafc;
      background: linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #0f172a 100%);
      -webkit-font-smoothing: antialiased;
    }
    .poster {
      width: 100%;
      height: 100%;
      padding: calc(56 * var(--unit));
      display: flex;
      flex-direction: column;
      gap: calc(32 * var(--unit));
    }
    .header { display: flex; flex-direction: column; gap: calc(8 * var(--unit)); }
    .title {
      font-size: calc(64 * var(--unit));
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: calc(-1 * var(--unit));
    }
    .subtitle { font-size: calc(26 * var(--unit)); color: #94a3b8; }
    .accent {
      width: calc(96 * var(--unit));
      height: calc(6 * var(--unit));
      background: #f59e0b;
      border-radius: 999px;
      margin-top: calc(12 * var(--unit));
    }
    .cards {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: calc(20 * var(--unit));
      min-height: 0;
      /* Guarantees the stack can never spill over the footer, whatever the data. */
      overflow: hidden;
    }
    .card {
      background: rgba(255, 255, 255, 0.06);
      border: calc(1 * var(--unit)) solid rgba(255, 255, 255, 0.1);
      border-radius: calc(24 * var(--unit));
      padding: calc(24 * var(--unit)) calc(28 * var(--unit));
      display: flex;
      flex-direction: column;
      gap: calc(14 * var(--unit));
      /* Natural height: a short list must not stretch its cards to fill the poster. */
      flex: 0 0 auto;
    }
    .card-meta {
      display: flex;
      justify-content: space-between;
      gap: calc(16 * var(--unit));
      font-size: calc(20 * var(--unit));
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: calc(0.5 * var(--unit));
    }
    /*
     * Every text line is clamped so a card has the same height whatever the
     * data. Without this, one long club name would wrap and push the stack
     * past the bottom of the poster.
     */
    .card-meta span,
    .team-name,
    .team-club,
    .lineup {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .card-meta span:last-child { flex: none; }
    .card-body {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: calc(20 * var(--unit));
      align-items: center;
    }
    .team { min-width: 0; }
    .team.right { text-align: right; }
    .team-name {
      font-size: calc(34 * var(--unit));
      font-weight: 800;
      line-height: 1.15;
    }
    .team-club { font-size: calc(22 * var(--unit)); color: #cbd5e1; }
    .team.highlight .team-name { color: #f59e0b; }
    .lineup {
      margin-top: calc(6 * var(--unit));
      font-size: calc(18 * var(--unit));
      color: #94a3b8;
      line-height: 1.3;
    }
    .score-block { text-align: center; }
    .score {
      font-size: calc(48 * var(--unit));
      font-weight: 900;
      white-space: nowrap;
    }
    .status {
      font-size: calc(17 * var(--unit));
      color: #94a3b8;
      text-transform: uppercase;
    }
    .empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: calc(32 * var(--unit));
      color: #94a3b8;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      font-size: calc(20 * var(--unit));
      color: #64748b;
    }
    body.compact .poster { padding: calc(40 * var(--unit)); gap: calc(22 * var(--unit)); }
    body.compact .title { font-size: calc(52 * var(--unit)); }
    body.compact .cards { gap: calc(16 * var(--unit)); }
    body.compact .card {
      padding: calc(18 * var(--unit)) calc(24 * var(--unit));
      gap: calc(10 * var(--unit));
    }`
}

/** Builds the standalone HTML document rendered by the headless browser. */
export const renderEncountersPoster = (
  input: EncountersPosterInput
): string => {
  const { encounters, format, highlightedClubName } = input
  const fonts = input.fonts ?? loadEmbeddedFonts()
  const visible = encounters.slice(0, format.maxEncounters)
  const hiddenCount = encounters.length - visible.length

  const title = input.title ?? defaultTitle(encounters)
  const subtitle = input.subtitle ?? defaultSubtitle(encounters)

  const cards =
    visible.length === 0
      ? renderEmptyState()
      : visible
          .map((encounter) =>
            renderEncounter(encounter, highlightedClubName, format.compact)
          )
          .join('')

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>${renderStyles(format, fonts)}</style>
</head>
<body class="${format.compact ? 'compact' : ''}">
<div class="poster">
  <header class="header">
    <div class="title">${escapeHtml(title)}</div>
    ${subtitle === '' ? '' : `<div class="subtitle">${escapeHtml(subtitle)}</div>`}
    <div class="accent"></div>
  </header>
  <main class="cards">${cards}</main>
  <footer class="footer">
    <span>${escapeHtml(highlightedClubName ?? '')}</span>
    <span>${hiddenCount > 0 ? `+${String(hiddenCount)} autre${hiddenCount > 1 ? 's' : ''}` : ''}</span>
  </footer>
</div>
</body>
</html>`
}
