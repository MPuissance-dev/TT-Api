/** Championships run from September to May, so a season starts during the summer. */
const seasonStartMonth = 7

export type ChampionshipPhase = 1 | 2

export const seasonNameFromDate = (reference: Date = new Date()): string => {
  const startYear =
    reference.getUTCMonth() + 1 >= seasonStartMonth
      ? reference.getUTCFullYear()
      : reference.getUTCFullYear() - 1

  return `${startYear}/${startYear + 1}`
}

export const seasonStartYear = (name: string): number => {
  const match = name.match(/^(\d{4})\/(\d{4})$/)
  if (match === null) {
    throw new Error(
      `Invalid season name: ${name}. Expected the 2025/2026 format`
    )
  }

  const startYear = Number(match[1])
  if (Number(match[2]) !== startYear + 1) {
    throw new Error(
      `Invalid season name: ${name}. A season spans two consecutive years`
    )
  }

  return startYear
}

export const phaseFromDate = (
  reference: Date = new Date()
): ChampionshipPhase =>
  reference.getUTCMonth() + 1 >= seasonStartMonth ? 1 : 2

export const phaseFromLabel = (
  label: string
): ChampionshipPhase | undefined => {
  const match = label.match(/phase\s*([12])\b/i)
  return match === null ? undefined : (Number(match[1]) as ChampionshipPhase)
}
