const app = document.querySelector('#app')

const categoryLabels = {
  senior: 'Seniors',
  youth: 'Jeunes',
  veteran: 'Vétérans',
}
const statusLabels = {
  PLAYED: 'Jouée',
  SCHEDULED: 'À venir',
  REPORTED: 'Reportée',
}

/** Same rule as the API: a season starts in July, and so does its first phase. */
const today = new Date()
const currentSeason = () => {
  const start =
    today.getMonth() + 1 >= 7 ? today.getFullYear() : today.getFullYear() - 1
  return `${start}/${start + 1}`
}
const currentPhase = () => (today.getMonth() + 1 >= 7 ? 1 : 2)

const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]
  )

const query = (params) =>
  new URLSearchParams(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null
    )
  ).toString()

const api = async (url, options) => {
  const response = await fetch(url, {
    ...options,
    headers: options?.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (response.status === 404) {
    throw new Error('Élément introuvable.')
  }
  if (!response.ok) {
    throw new Error(`L'API a répondu ${response.status}.`)
  }
  return response.json()
}

/* Dates are Paris wall-clock times stored on the UTC calendar, midnight meaning no time is known. */
const formatDate = (iso, withTime = true) => {
  const date = new Date(iso)
  const day = date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  if (!withTime || (hours === 0 && minutes === 0)) {
    return day
  }
  return `${day} à ${hours}h${String(minutes).padStart(2, '0')}`
}

const formatWeekend = ({ start, end }) => {
  const format = (iso, options) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', {
      ...options,
      timeZone: 'UTC',
    })
  return `${format(start, { day: 'numeric' })} – ${format(end, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`
}

const score = (home, away) =>
  home === null || home === undefined || away === null || away === undefined
    ? '–'
    : `${home} – ${away}`

const teamLink = (team, context) =>
  `<a href="#/team/${escape(team.id)}?${query(context)}">${escape(team.name)}</a>`
const playerLink = (player, context) =>
  `<a href="#/player/${escape(player.id)}?${query({
    season: context.season,
    phase: context.phase,
  })}">${escape(player.fullName)}</a>`
const encounterLink = (encounter, context, label) =>
  `<a href="#/encounter/${escape(encounter.id)}?${query({
    category: context.category,
  })}">${label}</a>`
const players = (list, context) =>
  list.length === 0
    ? '<span class="muted">—</span>'
    : list.map((player) => playerLink(player, context)).join(' / ')

const backLink = '<a href="javascript:history.back()" class="back">← Retour</a>'

/* ---------- Pages ---------- */

const renderHome = () => {
  const radios = (name, options, checked) =>
    options
      .map(
        ([value, label]) =>
          `<label><input type="radio" name="${name}" value="${value}" ${
            String(value) === String(checked) ? 'checked' : ''
          } /> ${label}</label>`
      )
      .join('')

  app.innerHTML = `
    <h1>Calendrier du championnat</h1>
    <p class="muted">Choisis le championnat et la phase à afficher.</p>
    <form class="choice card">
      <fieldset>
        <legend>Catégorie</legend>
        ${radios('category', Object.entries(categoryLabels), 'senior')}
      </fieldset>
      <fieldset>
        <legend>Phase</legend>
        ${radios(
          'phase',
          [
            [1, 'Phase 1'],
            [2, 'Phase 2'],
          ],
          currentPhase()
        )}
      </fieldset>
      <fieldset>
        <legend>Saison</legend>
        <input type="text" name="season" value="${currentSeason()}" pattern="\\d{4}/\\d{4}" required />
      </fieldset>
      <button type="submit">Voir le calendrier</button>
    </form>`

  app.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault()
    const form = new FormData(event.target)
    location.hash = `#/calendar?${query(Object.fromEntries(form))}`
  })
}

const renderCalendar = async (params) => {
  const context = {
    season: params.get('season') ?? currentSeason(),
    phase: Number(params.get('phase') ?? currentPhase()),
    category: params.get('category') ?? 'senior',
  }

  const [calendar, encounters] = await Promise.all([
    api(`/api/encounters/calendar?${query(context)}`),
    api('/api/encounters/encounters-search', {
      method: 'POST',
      body: JSON.stringify(context),
    }),
  ])

  const byDay = new Map()
  for (const encounter of encounters) {
    const day = encounter.championshipDayNumber
    byDay.set(day, [...(byDay.get(day) ?? []), encounter])
  }

  const renderEncounters = (list) => {
    const byDivision = new Map()
    for (const encounter of list.sort(
      (a, b) =>
        `${a.division} ${a.pool}`.localeCompare(`${b.division} ${b.pool}`) ||
        a.played_at.localeCompare(b.played_at)
    )) {
      const key = `${encounter.division} · ${encounter.pool}`
      byDivision.set(key, [...(byDivision.get(key) ?? []), encounter])
    }

    return [...byDivision.entries()]
      .map(
        ([division, divisionEncounters]) => `
          <div class="division">${escape(division)}</div>
          ${divisionEncounters
            .map(
              (encounter) => `
                <div class="encounter">
                  <div>${teamLink(encounter.homeTeam, context)}</div>
                  <div class="score">${encounterLink(
                    encounter,
                    context,
                    escape(score(encounter.homeScore, encounter.awayScore))
                  )}</div>
                  <div class="away">${teamLink(encounter.awayTeam, context)}</div>
                </div>`
            )
            .join('')}`
      )
      .join('')
  }

  const days = calendar.days.map(
    (day) => `
      <section class="card">
        <h2 style="margin-top:0">Journée ${day.dayNumber}
          <span class="muted"> · ${escape(formatWeekend(day.weekend))}</span></h2>
        ${renderEncounters(byDay.get(day.dayNumber) ?? [])}
      </section>`
  )
  const withoutDay = byDay.get(null) ?? []
  if (withoutDay.length > 0) {
    days.push(`
      <section class="card">
        <h2 style="margin-top:0">Autres rencontres</h2>
        ${renderEncounters(withoutDay)}
      </section>`)
  }

  app.innerHTML = `
    <a href="#/" class="back">← Changer de calendrier</a>
    <h1>${escape(categoryLabels[context.category])} · Phase ${context.phase}</h1>
    <p class="muted">Saison ${escape(context.season)}</p>
    ${days.length === 0 ? '<p class="card muted">Aucune rencontre pour ce calendrier.</p>' : days.join('')}`
}

const renderEncounter = async (id, params) => {
  const encounter = await api(`/api/encounters/${encodeURIComponent(id)}`)
  const context = {
    season: encounter.season,
    phase: encounter.phase,
    category: params.get('category') ?? 'senior',
  }

  const lineup = (team) =>
    team.lineup.length === 0
      ? '<p class="muted">Composition non publiée.</p>'
      : `<ul>${team.lineup
          .map(
            (player) =>
              `<li>${playerLink(player, context)} <span class="muted">${escape(
                player.points
              )} pts</span></li>`
          )
          .join('')}</ul>`

  const winnerClass = (match, side) => (match.winner === side ? 'won' : '')

  app.innerHTML = `
    ${backLink}
    <p class="muted">${escape(encounter.division)} · ${escape(encounter.pool)}
      ${encounter.championshipDayNumber ? ` · Journée ${encounter.championshipDayNumber}` : ''}
      · ${escape(formatDate(encounter.played_at))}
      <span class="badge">${escape(statusLabels[encounter.status])}</span></p>
    <div class="card encounter">
      <h1>${teamLink(encounter.homeTeam, context)}</h1>
      <div class="score" style="font-size:1.6rem">${escape(
        score(encounter.homeScore, encounter.awayScore)
      )}</div>
      <h1 class="away">${teamLink(encounter.awayTeam, context)}</h1>
    </div>

    <h2>Compositions</h2>
    <div class="card encounter" style="align-items:start">
      <div>${lineup(encounter.homeTeam)}</div>
      <div></div>
      <div>${lineup(encounter.awayTeam)}</div>
    </div>

    <h2>Parties</h2>
    ${
      encounter.matches.length === 0
        ? '<p class="card muted">Feuille de match non publiée.</p>'
        : `<table>
            <thead><tr><th>#</th><th>${escape(encounter.homeTeam.name)}</th>
              <th class="num">Score</th><th>${escape(encounter.awayTeam.name)}</th>
              <th>Manches</th></tr></thead>
            <tbody>${encounter.matches
              .map(
                (match) => `
                  <tr>
                    <td>${match.number}${match.type === 'DOUBLE' ? ' <span class="badge">Double</span>' : ''}</td>
                    <td class="${winnerClass(match, 'HOME')}">${players(match.homePlayers, context)}</td>
                    <td class="num">${escape(score(match.homeScore, match.awayScore))}</td>
                    <td class="${winnerClass(match, 'AWAY')}">${players(match.awayPlayers, context)}</td>
                    <td class="muted">${escape(match.setDetails ?? '')}</td>
                  </tr>`
              )
              .join('')}</tbody>
          </table>`
    }`
}

const renderTeam = async (id, params) => {
  const context = {
    season: params.get('season') ?? currentSeason(),
    phase: Number(params.get('phase') ?? currentPhase()),
    category: params.get('category') ?? 'senior',
  }
  const team = await api(
    `/api/teams/${encodeURIComponent(id)}?${query(context)}`
  )
  const otherPhase = context.phase === 1 ? 2 : 1

  app.innerHTML = `
    ${backLink}
    <h1>${escape(team.name)}</h1>
    <p class="muted">${escape(team.clubName)} · ${escape(categoryLabels[team.category])}
      · Saison ${escape(team.season)} · Phase ${team.phase}
      (<a href="#/team/${escape(team.id)}?${query({ ...context, phase: otherPhase })}">voir la phase ${otherPhase}</a>)</p>
    ${
      team.division === null
        ? '<p class="card muted">Équipe non engagée sur cette phase.</p>'
        : `<p><span class="badge">${escape(team.division.level)}</span>
            ${escape(team.division.name)} · ${escape(team.pool)}</p>`
    }

    <h2>Classement</h2>
    ${
      team.ranking.length === 0
        ? '<p class="card muted">Classement non disponible.</p>'
        : `<table>
            <thead><tr><th>#</th><th>Équipe</th><th class="num">Pts</th><th class="num">J</th>
              <th class="num">V</th><th class="num">N</th><th class="num">D</th>
              <th class="num">Parties</th></tr></thead>
            <tbody>${team.ranking
              .map(
                (entry) => `
                  <tr class="${entry.team.id === team.id ? 'highlight' : ''}">
                    <td>${escape(entry.rank ?? '')}</td>
                    <td>${teamLink(entry.team, context)}</td>
                    <td class="num">${escape(entry.points ?? '')}</td>
                    <td class="num">${escape(entry.played ?? '')}</td>
                    <td class="num">${escape(entry.wins ?? '')}</td>
                    <td class="num">${escape(entry.draws ?? '')}</td>
                    <td class="num">${escape(entry.losses ?? '')}</td>
                    <td class="num">${
                      entry.gamesWon === null
                        ? ''
                        : `${entry.gamesWon} – ${entry.gamesLost}`
                    }</td>
                  </tr>`
              )
              .join('')}</tbody>
          </table>`
    }

    <h2>Calendrier</h2>
    ${
      team.calendar.length === 0
        ? '<p class="card muted">Aucune rencontre.</p>'
        : `<table>
            <thead><tr><th>J.</th><th>Date</th><th>Rencontre</th><th class="num">Score</th></tr></thead>
            <tbody>${team.calendar
              .map(
                (encounter) => `
                  <tr>
                    <td>${escape(encounter.championshipDayNumber ?? '')}</td>
                    <td>${escape(formatDate(encounter.played_at))}</td>
                    <td>${teamLink(encounter.homeTeam, context)} – ${teamLink(encounter.awayTeam, context)}</td>
                    <td class="num">${encounterLink(
                      encounter,
                      context,
                      escape(
                        encounter.status === 'PLAYED'
                          ? score(encounter.homeScore, encounter.awayScore)
                          : statusLabels[encounter.status]
                      )
                    )}</td>
                  </tr>`
              )
              .join('')}</tbody>
          </table>`
    }

    <h2>Joueurs</h2>
    ${
      team.players.length === 0
        ? '<p class="card muted">Aucun joueur aligné pour le moment.</p>'
        : `<table>
            <thead><tr><th>Joueur</th><th class="num">Points</th><th class="num">Rencontres</th></tr></thead>
            <tbody>${team.players
              .map(
                (player) => `
                  <tr>
                    <td>${playerLink(player, context)}</td>
                    <td class="num">${escape(player.points)}</td>
                    <td class="num">${escape(player.appearances)}</td>
                  </tr>`
              )
              .join('')}</tbody>
          </table>`
    }`
}

const renderPlayer = async (id, params) => {
  const context = {
    season: params.get('season') ?? currentSeason(),
    phase: Number(params.get('phase') ?? currentPhase()),
  }
  const player = await api(
    `/api/players/${encodeURIComponent(id)}?${query(context)}`
  )
  const otherPhase = context.phase === 1 ? 2 : 1
  const teamCategories = new Map(
    player.encounters.map(({ team, category }) => [team.id, category])
  )
  const record = ({ won, lost }) =>
    `<span class="won">${won} V</span> · <span class="lost">${lost} D</span>`

  app.innerHTML = `
    ${backLink}
    <h1>${escape(player.fullName)}</h1>
    <p class="muted">${escape(player.clubName)} · ${escape(player.points)} points
      · Saison ${escape(player.season)} · Phase ${player.phase}
      (<a href="#/player/${escape(player.id)}?${query({ ...context, phase: otherPhase })}">voir la phase ${otherPhase}</a>)</p>

    <div class="card stats">
      <div><strong>${player.record.encounters}</strong>rencontres</div>
      <div><strong>${record(player.record.singles)}</strong>en simple</div>
      <div><strong>${record(player.record.doubles)}</strong>en double</div>
    </div>

    ${
      player.teams.length === 0
        ? ''
        : `<p>Équipes : ${player.teams
            .map(
              ({ team, appearances }) =>
                `${teamLink(team, { ...context, category: teamCategories.get(team.id) })} <span class="muted">(${appearances})</span>`
            )
            .join(', ')}</p>`
    }

    <h2>Rencontres</h2>
    ${
      player.encounters.length === 0
        ? '<p class="card muted">Aucune rencontre jouée sur cette phase.</p>'
        : player.encounters
            .map(({ encounter, category, games }) => {
              const encounterContext = { ...context, category }
              return `
                <section class="card">
                  <p class="muted" style="margin-top:0">
                    ${encounter.championshipDayNumber ? `Journée ${encounter.championshipDayNumber} · ` : ''}
                    ${escape(formatDate(encounter.played_at))}
                    <span class="badge">${escape(categoryLabels[category])}</span></p>
                  <div class="encounter">
                    <div>${teamLink(encounter.homeTeam, encounterContext)}</div>
                    <div class="score">${encounterLink(
                      encounter,
                      encounterContext,
                      escape(score(encounter.homeScore, encounter.awayScore))
                    )}</div>
                    <div class="away">${teamLink(encounter.awayTeam, encounterContext)}</div>
                  </div>
                  ${
                    games.length === 0
                      ? '<p class="muted">Parties non publiées.</p>'
                      : `<table>
                          <thead><tr><th>Partie</th><th>Adversaire(s)</th><th>Résultat</th>
                            <th class="num">Score</th><th>Manches</th></tr></thead>
                          <tbody>${games
                            .map(
                              (game) => `
                                <tr>
                                  <td>${
                                    game.type === 'DOUBLE'
                                      ? `Double${game.partner ? ` avec ${playerLink(game.partner, context)}` : ''}`
                                      : 'Simple'
                                  }</td>
                                  <td>${players(game.opponents, context)}</td>
                                  <td class="${game.result === 'WON' ? 'won' : game.result === 'LOST' ? 'lost' : ''}">${
                                    game.result === 'WON'
                                      ? 'Victoire'
                                      : game.result === 'LOST'
                                        ? 'Défaite'
                                        : '<span class="muted">Non jouée</span>'
                                  }</td>
                                  <td class="num">${escape(score(game.scoreFor, game.scoreAgainst))}</td>
                                  <td class="muted">${escape(game.setDetails ?? '')}</td>
                                </tr>`
                            )
                            .join('')}</tbody>
                        </table>`
                  }
                </section>`
            })
            .join('')
    }`
}

/* ---------- Router ---------- */

const routes = [
  [/^\/?$/, () => renderHome()],
  [/^\/calendar$/, (_, params) => renderCalendar(params)],
  [/^\/encounter\/([^/]+)$/, ([, id], params) => renderEncounter(id, params)],
  [/^\/team\/([^/]+)$/, ([, id], params) => renderTeam(id, params)],
  [/^\/player\/([^/]+)$/, ([, id], params) => renderPlayer(id, params)],
]

const route = async () => {
  const [path, search = ''] = location.hash.replace(/^#/, '').split('?')
  const params = new URLSearchParams(search)
  const match = routes
    .map(([pattern, render]) => [path.match(pattern), render])
    .find(([found]) => found !== null)

  window.scrollTo(0, 0)
  if (match === undefined) {
    app.innerHTML =
      '<p class="error">Page inconnue.</p><a href="#/">Accueil</a>'
    return
  }

  app.innerHTML = '<p class="muted">Chargement…</p>'
  try {
    await match[1](match[0], params)
  } catch (error) {
    app.innerHTML = `${backLink}<p class="error">${escape(error.message)}</p>`
  }
}

window.addEventListener('hashchange', route)
route()
