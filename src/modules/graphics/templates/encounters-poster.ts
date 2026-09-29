import type { ImageFormat, PosterDensity } from '../formats.js'
import { loadEmbeddedFonts, type EmbeddedFonts } from '../fonts.js'
import type { PosterEncounter, PosterTeam } from '../view-model.js'
import { hasKnownTime } from '../../divisions/schedule.js'

export interface EncountersPosterInput {
  readonly encounters: PosterEncounter[]
  readonly format: ImageFormat
  /** Defaults to the championship day of the first encounter. */
  readonly title?: string | undefined
  /** Defaults to the season and phase of the first encounter. */
  readonly subtitle?: string | undefined
  /** Club name displayed in the footer. */
  readonly highlightedClubName?: string | undefined
  /** FFTT number of the club whose teams and wins are emphasised. */
  readonly highlightedClubNumber?: string | undefined
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

/**
 * Encounter dates are Paris wall-clock times stored on the UTC calendar, so
 * they are formatted in UTC: converting them to Paris would shift the time.
 */
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

const formatTime = (date: Date): string => {
  const hours = String(date.getUTCHours())
  const minutes = date.getUTCMinutes()
  return minutes === 0
    ? `${hours}h`
    : `${hours}h${String(minutes).padStart(2, '0')}`
}

const formatPlayedAt = (playedAt: string): string => {
  const date = new Date(playedAt)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const day = dateFormatter.format(date)
  // Midnight means the FFTT gave no time and no default applies to the level.
  return hasKnownTime(date) ? `${day} · ${formatTime(date)}` : day
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

const isClubTeam = (
  team: PosterTeam,
  highlightedClubNumber: string | undefined
): boolean =>
  highlightedClubNumber !== undefined &&
  team.clubNumber === highlightedClubNumber

export const isHighlightedClubWin = (
  encounter: PosterEncounter,
  highlightedClubNumber: string | undefined
): boolean => {
  if (
    encounter.status !== 'PLAYED' ||
    encounter.homeScore === null ||
    encounter.awayScore === null
  ) {
    return false
  }
  const home = isClubTeam(encounter.homeTeam, highlightedClubNumber)
  const away = isClubTeam(encounter.awayTeam, highlightedClubNumber)
  if (home === away) {
    return false
  }
  return home
    ? encounter.homeScore > encounter.awayScore
    : encounter.awayScore > encounter.homeScore
}

const renderTeam = (
  team: PosterTeam,
  alignment: 'left' | 'right',
  highlightedClubNumber: string | undefined,
  density: PosterDensity
): string => {
  const highlighted = isClubTeam(team, highlightedClubNumber)
  const lineup =
    density === 'regular'
      ? team.lineup.map((player) => escapeHtml(player.fullName)).join(' · ')
      : ''
  const club =
    density === 'dense'
      ? ''
      : `<div class="team-club">${escapeHtml(team.clubName)}</div>`

  return `<div class="team ${alignment}${highlighted ? ' highlight' : ''}">
      <div class="team-name">${escapeHtml(team.name)}</div>
      ${club}
      ${lineup === '' ? '' : `<div class="lineup">${lineup}</div>`}
    </div>`
}

const renderEncounter = (
  encounter: PosterEncounter,
  highlightedClubNumber: string | undefined,
  density: PosterDensity
): string => {
  const win = isHighlightedClubWin(encounter, highlightedClubNumber)
  const status = win ? 'Victoire' : statusLabels[encounter.status]

  return `<article class="card${win ? ' win' : ''}">
    <div class="card-meta">
      <span>${escapeHtml(encounter.division)} · ${escapeHtml(encounter.pool)}</span>
      <span>${escapeHtml(formatPlayedAt(encounter.playedAt))}</span>
    </div>
    <div class="card-body">
      ${renderTeam(encounter.homeTeam, 'left', highlightedClubNumber, density)}
      <div class="score-block">
        <div class="score">${escapeHtml(formatScore(encounter))}</div>
        <div class="status">${escapeHtml(status)}</div>
      </div>
      ${renderTeam(encounter.awayTeam, 'right', highlightedClubNumber, density)}
    </div>
  </article>`
}

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
      /* Club colours: black, white and blue RGB(70, 144, 180). */
      --club-blue: #4690b4;
      --club-blue-dark: #2c6482;
      --text: #ffffff;
      --text-muted: #a3a3a3;
      --text-soft: #d4d4d4;
      font-family: ${fonts.fontFamily};
      color: var(--text);
      background: linear-gradient(160deg, #000000 0%, #141414 55%, #000000 100%);
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
    .subtitle { font-size: calc(26 * var(--unit)); color: var(--text-muted); }
    .accent {
      width: calc(96 * var(--unit));
      height: calc(6 * var(--unit));
      background: var(--club-blue);
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
      background: rgba(255, 255, 255, 0.07);
      border: calc(1 * var(--unit)) solid rgba(255, 255, 255, 0.12);
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
      color: var(--text-muted);
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
    .team-club { font-size: calc(22 * var(--unit)); color: var(--text-soft); }
    .team.highlight .team-name { color: var(--club-blue); }
    .lineup {
      margin-top: calc(6 * var(--unit));
      font-size: calc(18 * var(--unit));
      color: var(--text-muted);
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
      color: var(--text-muted);
      text-transform: uppercase;
    }
.card.win {
      background: linear-gradient(
        135deg,
        var(--club-blue) 0%,
        var(--club-blue-dark) 100%
      );
      border-color: rgba(255, 255, 255, 0.35);
      box-shadow: 0 0 calc(24 * var(--unit)) rgba(70, 144, 180, 0.35);
    }
    /* On the blue card, the club's own blue would vanish: everything is white. */
    .card.win .card-meta,
    .card.win .team-club,
    .card.win .lineup { color: rgba(255, 255, 255, 0.8); }
    .card.win .team.highlight .team-name,
    .card.win .score { color: var(--text); }
    .card.win .status { color: var(--text); font-weight: 800; }
    .empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: calc(32 * var(--unit));
      color: var(--text-muted);
    }
    .footer {
      display: flex;
      justify-content: space-between;
      font-size: calc(20 * var(--unit));
      color: #737373;
    }
    body.compact .poster { padding: calc(40 * var(--unit)); gap: calc(22 * var(--unit)); }
    body.compact .title { font-size: calc(52 * var(--unit)); }
    body.compact .cards { gap: calc(16 * var(--unit)); }
    body.compact .card {
      padding: calc(18 * var(--unit)) calc(24 * var(--unit));
      gap: calc(10 * var(--unit));
    }
    body.dense .poster { padding: calc(44 * var(--unit)); gap: calc(20 * var(--unit)); }
    body.dense .header { gap: calc(4 * var(--unit)); }
    body.dense .title { font-size: calc(52 * var(--unit)); }
    body.dense .subtitle { font-size: calc(22 * var(--unit)); }
    body.dense .accent { margin-top: calc(6 * var(--unit)); }
    body.dense .cards { gap: calc(10 * var(--unit)); }
    body.dense .card {
      padding: calc(12 * var(--unit)) calc(24 * var(--unit));
      gap: calc(4 * var(--unit));
      border-radius: calc(18 * var(--unit));
    }
    body.dense .card-meta { font-size: calc(17 * var(--unit)); }
    body.dense .team-name { font-size: calc(30 * var(--unit)); }
    body.dense .score { font-size: calc(38 * var(--unit)); line-height: 1.1; }
    body.dense .status { font-size: calc(13 * var(--unit)); line-height: 1.2; }
    body.dense .footer { font-size: calc(18 * var(--unit)); }`
}

/** Builds the standalone HTML document rendered by the headless browser. */
export const renderEncountersPoster = (
  input: EncountersPosterInput
): string => {
  const { encounters, format, highlightedClubName, highlightedClubNumber } =
    input
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
            renderEncounter(encounter, highlightedClubNumber, format.density)
          )
          .join('')

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>${renderStyles(format, fonts)}</style>
</head>
<body class="${format.density}">
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
