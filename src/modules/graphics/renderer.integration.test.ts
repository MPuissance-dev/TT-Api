import assert from 'node:assert/strict'
import test from 'node:test'
import { imageFormats } from './formats.js'
import { createPosterRenderer } from './renderer.js'

/** Reads width and height from the IHDR chunk of a PNG buffer. */
const pngSize = (buffer: Buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
})

const isPng = (buffer: Buffer) =>
  buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

test('the renderer rasterises a document at the exact size of the format', async () => {
  const renderer = createPosterRenderer()

  try {
    const format = imageFormats['facebook-link']
    const png = await renderer.toPng(
      `<html><body style="margin:0;background:#0f172a"></body></html>`,
      format
    )

    assert.ok(isPng(png))
    assert.deepEqual(pngSize(png), {
      width: format.width,
      height: format.height,
    })
  } finally {
    await renderer.close()
  }
})

test('the browser is reused across renders and can be closed twice', async () => {
  const renderer = createPosterRenderer()

  const [first, second] = await Promise.all([
    renderer.toPng(
      '<html><body>a</body></html>',
      imageFormats['facebook-link']
    ),
    renderer.toPng(
      '<html><body>b</body></html>',
      imageFormats['facebook-link']
    ),
  ])

  assert.ok(isPng(first))
  assert.ok(isPng(second))

  await renderer.close()
  await renderer.close()
})
