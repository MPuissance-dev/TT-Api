import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultImageFormat,
  imageFormatNames,
  imageFormats,
  resolveImageFormat,
} from './formats.js'

test('every format exposes coherent dimensions', () => {
  for (const name of imageFormatNames) {
    const format = imageFormats[name]
    assert.equal(format.name, name)
    assert.ok(format.width > 0 && format.height > 0)
    assert.ok(format.maxEncounters > 0)
    assert.ok(format.textScale > 0)
  }
})

test('an absent format falls back to the default one', () => {
  assert.equal(resolveImageFormat(undefined).name, defaultImageFormat)
})

test('a known format is resolved', () => {
  const format = resolveImageFormat('instagram-story')

  assert.equal(format.width, 1080)
  assert.equal(format.height, 1920)
})

test('an unknown format lists the supported ones', () => {
  assert.throws(
    () => resolveImageFormat('tiktok'),
    (error: Error) =>
      error.message.includes('tiktok') &&
      error.message.includes('instagram-square')
  )
})
