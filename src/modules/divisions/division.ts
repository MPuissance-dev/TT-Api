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
