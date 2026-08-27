/** Accent, case and punctuation insensitive form used to compare FFTT labels. */
export const normalizeName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * FFTT alternates between `NOM Prenom` and `Prenom NOM`, and composed names are not always
 * ordered the same way, so names are compared as an order-insensitive set of tokens.
 */
export const nameKey = (name: string): string =>
  normalizeName(name)
    .split(' ')
    .filter((token) => token.length > 0)
    .sort()
    .join(' ')

/** Collapses repeated whitespace while keeping the original casing and accents. */
export const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim()
