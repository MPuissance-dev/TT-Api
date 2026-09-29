import { collapseWhitespace, normalizeName } from '../../shared/text.js'
import { phaseFromLabel, type ChampionshipPhase } from '../seasons/season.js'

export const divisionEchelons = [
  'national',
  'zone',
  'regional',
  'departmental',
] as const

export type DivisionEchelon = (typeof divisionEchelons)[number]

/** FFTT labels start with the code of their organizer: FED, Z04, L12, D44... */
const organizerPattern = /^(fed|z\d{1,2}|l\d{2}|d(?:\d{2,3}|2a|2b))\b/

const organizerEchelons: [RegExp, DivisionEchelon][] = [
  [/^fed$/, 'national'],
  [/^z/, 'zone'],
  [/^l/, 'regional'],
  [/^d/, 'departmental'],
]

/**
 * Ordered from the most specific to the least specific so that `Pré-` prefixes
 * win. The FFTT abbreviates them freely: PRENAT, Reg., PR, D1...
 */
const levels: [RegExp, string, DivisionEchelon][] = [
  [/\bpre ?nat(?:ionale?)?\b|\bpn\b/, 'Pré-Nationale', 'regional'],
  [/\bnat(?:ionale?)?\b|\bn\d\b/, 'Nationale', 'national'],
  [/\bpre ?reg(?:ionale?)?\b|\bpr\b/, 'Pré-Régionale', 'departmental'],
  [/\breg(?:ionale?)?\b|\br\d\b/, 'Régionale', 'regional'],
  [
    /\bpre ?dep(?:artementale?)?\b|\bpd\b/,
    'Pré-Départementale',
    'departmental',
  ],
  [/\bdep(?:artementale?)?\b|\bd\d\b/, 'Départementale', 'departmental'],
]

/** Used when the wording names no level at all. */
const fallbackLevels: Partial<Record<DivisionEchelon, string>> = {
  national: 'Nationale',
  regional: 'Régionale',
  departmental: 'Départementale',
}

export const divisionCategories = ['senior', 'youth', 'veteran'] as const

export type DivisionCategory = (typeof divisionCategories)[number]

/**
 * The FFTT never states the category of a championship: it can only be read
 * from the wording of the event and of the division it belongs to.
 */
const categoryPatterns: [RegExp, DivisionCategory][] = [
  [/\bveterans?\b|\bplus de \d+\b|\bv[1-9]\b/, 'veteran'],
  [
    /\bjeunes?\b|\bjuniors?\b|\bcadets?\b|\bminimes?\b|\bbenjamins?\b|\bpoussins?\b|\bscolaires?\b|\bmoins de \d+\b|\bu\d{2}\b|\b\d{2} ans\b/,
    'youth',
  ],
]

/** Defaults to senior, the championship every other one is an exception to. */
export const divisionCategoryOf = (
  ...labels: (string | undefined)[]
): DivisionCategory => {
  const normalized = normalizeName(
    labels.filter((label) => label !== undefined).join(' ')
  )

  return (
    categoryPatterns.find(([pattern]) => pattern.test(normalized))?.[1] ??
    'senior'
  )
}

export interface ParsedDivisionLabel {
  name: string
  level: string
  /** Body organizing the division, when the label tells it. */
  echelon?: DivisionEchelon
  phase?: ChampionshipPhase
}

export const parseDivisionLabel = (label: string): ParsedDivisionLabel => {
  const phase = phaseFromLabel(label)
  const name = collapseWhitespace(
    label.replace(/[\s-]*\bph(?:ase)?\s*[12]\b/i, '')
  )
  const normalized = normalizeName(name)
  // The organizer code is dropped first, otherwise D44 would read as a D4.
  const organizer = normalized.match(organizerPattern)?.[1]
  const wording =
    organizer === undefined ? normalized : normalized.slice(organizer.length)

  const matched = levels.find(([pattern]) => pattern.test(wording))
  const organizerEchelon =
    organizer === undefined
      ? undefined
      : organizerEchelons.find(([pattern]) => pattern.test(organizer))?.[1]
  const echelon = organizerEchelon ?? matched?.[2]
  const level =
    matched?.[1] ??
    (echelon === undefined ? undefined : fallbackLevels[echelon]) ??
    name

  return {
    name,
    level,
    ...(echelon === undefined ? {} : { echelon }),
    ...(phase === undefined ? {} : { phase }),
  }
}
