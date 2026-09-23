/**
 * Social network image formats. Each one is rendered by its own layout variant
 * rather than by scaling a single design, so text stays readable everywhere.
 */
export interface ImageFormat {
  /** Identifier used in the API payload. */
  readonly name: ImageFormatName
  /** Human readable label, useful for the preview page and error messages. */
  readonly label: string
  readonly width: number
  readonly height: number
  /** How many encounters the layout can show without overflowing. */
  readonly maxEncounters: number
  /** Multiplier applied to the base typography of the template. */
  readonly textScale: number
  /**
   * Short formats cannot fit the lineups without clipping, so they drop them
   * and tighten the spacing instead of shrinking the text below readability.
   */
  readonly compact: boolean
}

export type ImageFormatName =
  | 'instagram-square'
  | 'instagram-portrait'
  | 'instagram-story'
  | 'facebook-square'
  | 'facebook-link'

export const imageFormats: Record<ImageFormatName, ImageFormat> = {
  'instagram-square': {
    name: 'instagram-square',
    label: 'Instagram square (1:1)',
    width: 1080,
    height: 1080,
    maxEncounters: 3,
    textScale: 1,
    compact: false,
  },
  'instagram-portrait': {
    name: 'instagram-portrait',
    label: 'Instagram portrait (4:5)',
    width: 1080,
    height: 1350,
    maxEncounters: 5,
    textScale: 1,
    compact: false,
  },
  'instagram-story': {
    name: 'instagram-story',
    label: 'Instagram story (9:16)',
    width: 1080,
    height: 1920,
    maxEncounters: 6,
    textScale: 1.1,
    compact: false,
  },
  'facebook-square': {
    name: 'facebook-square',
    label: 'Facebook post (1:1)',
    width: 1200,
    height: 1200,
    maxEncounters: 3,
    textScale: 1.05,
    compact: false,
  },
  'facebook-link': {
    name: 'facebook-link',
    label: 'Facebook link preview (1.91:1)',
    width: 1200,
    height: 630,
    maxEncounters: 2,
    textScale: 0.95,
    compact: true,
  },
}

export const imageFormatNames = Object.keys(imageFormats) as ImageFormatName[]

export const defaultImageFormat: ImageFormatName = 'instagram-portrait'

export const isImageFormatName = (value: string): value is ImageFormatName =>
  Object.hasOwn(imageFormats, value)

/** Resolves a format name coming from the outside world, or throws. */
export const resolveImageFormat = (value: string | undefined): ImageFormat => {
  const name = value ?? defaultImageFormat
  if (!isImageFormatName(name)) {
    throw new Error(
      `Unknown image format "${name}". Expected one of: ${imageFormatNames.join(', ')}.`
    )
  }
  return imageFormats[name]
}
