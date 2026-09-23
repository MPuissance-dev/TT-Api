import { collapseWhitespace, normalizeName } from '../../shared/text.js'
import { phaseFromLabel, type ChampionshipPhase } from '../seasons/season.js'

/** Ordered from the most specific to the least specific so that `Pré-` prefixes win. */
const levels: [RegExp, string][] = [
  [/pre\s*nationale?/, 'Pré-Nationale'],
  [/nationale?/, 'Nationale'],
  [/pre\s*regionale?/, 'Pré-Régionale'],
  [/regionale?/, 'Régionale'],
  [/pre\s*departementale?/, 'Pré-Départementale'],
  [/departementale?/, 'Départementale'],
]

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
  phase?: ChampionshipPhase
}

export const parseDivisionLabel = (label: string): ParsedDivisionLabel => {
  const phase = phaseFromLabel(label)
  const name = collapseWhitespace(label.replace(/[\s-]*phase\s*[12]\b/i, ''))
  const normalized = normalizeName(name)
  const level =
    levels.find(([pattern]) => pattern.test(normalized))?.[1] ?? name

  return {
    name,
    level,
    ...(phase === undefined ? {} : { phase }),
  }
}
