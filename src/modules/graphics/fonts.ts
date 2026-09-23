import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Directory holding the brand fonts. Files must be named `<family>-<weight>.woff2`
 * (for example `Barlow-700.woff2`) so the weight can be derived from the name.
 */
export const fontsDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'graphic',
  'fonts'
)

/**
 * Fallback stack used when no brand font is installed. Kept generic on purpose:
 * a headless Linux server has none of the fonts a macOS machine has, so the
 * rendering would silently differ without an embedded font.
 */
export const fallbackFontStack =
  "'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', sans-serif"

interface FontFile {
  readonly family: string
  readonly weight: number
  readonly base64: string
}

const fontFileNamePattern = /^(?<family>.+)-(?<weight>\d{3})\.woff2$/

const parseFontFile = (
  directory: string,
  fileName: string
): FontFile | undefined => {
  const groups = fontFileNamePattern.exec(fileName)?.groups
  if (groups?.family === undefined || groups.weight === undefined) {
    return undefined
  }

  return {
    family: groups.family,
    weight: Number(groups.weight),
    base64: readFileSync(join(directory, fileName)).toString('base64'),
  }
}

const readFontFiles = (directory: string): FontFile[] => {
  let fileNames: string[]
  try {
    fileNames = readdirSync(directory)
  } catch {
    return []
  }

  return fileNames
    .map((fileName) => parseFontFile(directory, fileName))
    .filter((font) => font !== undefined)
}

export interface EmbeddedFonts {
  /** `@font-face` rules to inject in the template, empty when no font is installed. */
  readonly css: string
  /** Value to use for the CSS `font-family` property. */
  readonly fontFamily: string
}

const toFontFace = (font: FontFile): string =>
  `@font-face{font-family:'${font.family}';font-weight:${font.weight};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${font.base64}) format('woff2');}`

/**
 * Reads the brand fonts and inlines them as data URIs. Inlining avoids any
 * network or `file://` access from the rendered page, which keeps the renderer
 * hermetic and reproducible.
 */
export const loadEmbeddedFonts = (
  directory: string = fontsDirectory
): EmbeddedFonts => {
  const fonts = readFontFiles(directory)
  if (fonts.length === 0) {
    return { css: '', fontFamily: fallbackFontStack }
  }

  const family = fonts[0]!.family
  return {
    css: fonts.map((font) => toFontFace(font)).join(''),
    fontFamily: `'${family}', ${fallbackFontStack}`,
  }
}
