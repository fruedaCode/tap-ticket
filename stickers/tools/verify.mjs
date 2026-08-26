// Decodes the QR in each rendered PNG to confirm scannability and payload.
// Run from the repo root: node stickers/tools/verify.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import jsQR from 'jsqr'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const EXPECTED =
  'https://tapticket.es/?utm_source=sticker&utm_medium=print&utm_campaign=restaurants'

let failed = 0
for (const file of fs.readdirSync(path.join(ROOT, 'stickers')).filter((f) => f.endsWith('.png'))) {
  const { data, info } = await sharp(path.join(ROOT, 'stickers', file))
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true })
  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height)
  const ok = code && code.data === EXPECTED
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${file}  ${code ? code.data : '(no QR decoded)'}`)
  if (!ok) failed++
}
process.exit(failed ? 1 : 0)
