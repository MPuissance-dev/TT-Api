import { collapseWhitespace, normalizeName } from '../../shared/text.js'

export interface ParsedTeamLabel {
  name: string
  normalizedName: string
  number?: number
}

/**
 * A team label ends with its rank inside the club, for instance `Mellinet TT 3`. The normalized
 * name is what identifies the team, because the FFTT reissues team identifiers every phase.
 */
export const parseTeamLabel = (label: string): ParsedTeamLabel => {
  const name = collapseWhitespace(label)
  if (name.length === 0) {
    throw new Error('A team label cannot be empty')
  }

  const match = name.match(/(\d+)\s*$/)
  const number = match === null ? undefined : Number(match[1])

  return {
    name,
    normalizedName: normalizeName(name),
    ...(number === undefined ? {} : { number }),
  }
}
