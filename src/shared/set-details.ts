/**
 * Inverts a set detail so it reads from the other side: `11/9` becomes `9/11`,
 * and the FFTT signed notation (`-8 9 5`) has every sign flipped.
 */
export const invertSetDetails = (setDetails: string): string =>
  setDetails
    .split(/(\s+)/)
    .map((token) => {
      const pair = /^(\d+)([/:-])(\d+)$/.exec(token)
      if (pair !== null) {
        return `${pair[3]}${pair[2]}${pair[1]}`
      }
      if (/^-\d+$/.test(token)) {
        return token.slice(1)
      }
      if (/^\d+$/.test(token)) {
        return `-${token}`
      }
      return token
    })
    .join('')
