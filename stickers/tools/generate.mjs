// Generates Tap Ticket QR stickers (SVG + 300 DPI PNG) in es/ca/en,
// round (Ø70mm) and card (85×55mm) formats, both with 3mm bleed.
// Run from the repo root: node stickers/tools/generate.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = path.join(ROOT, 'stickers')

// Brand tokens (public/logo.svg, app/globals.css)
const RED = '#DC2626'
const MAROON = '#450A0A'
const WHITE = '#FFFFFF'

const QR_URL =
  'https://tapticket.es/?utm_source=sticker&utm_medium=print&utm_campaign=restaurants'

// Geist Sans (latin subset, variable 100–900) cached by next/font at build time.
const FONT_PATH = path.join(
  ROOT,
  '.next/static/media/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2'
)
const FONT_B64 = fs.readFileSync(FONT_PATH).toString('base64')
const FONT_CSS = `@font-face{font-family:'GeistSticker';src:url(data:font/woff2;base64,${FONT_B64}) format('woff2');font-weight:100 900;font-style:normal;}`

const LANGS = {
  es: { line1: 'Escanea un ticket,', line2: 'divide la cuenta' },
  ca: { line1: 'Escaneja un tiquet,', line2: 'divideix el compte' },
  en: { line1: 'Scan a ticket,', line2: 'split the bill' },
}

// ---------------------------------------------------------------- QR matrix
// EC level H (30% damage tolerance) — stickers get scratched and worn.
const qr = QRCode.create(QR_URL, { errorCorrectionLevel: 'H' })
const QR_SIZE = qr.modules.size
const QR_DATA = qr.modules.data

/** SVG path data for the dark modules, drawn at (x, y) with the given module size. */
function qrPath(x, y, mod) {
  let d = ''
  for (let r = 0; r < QR_SIZE; r++) {
    for (let c = 0; c < QR_SIZE; c++) {
      if (QR_DATA[r * QR_SIZE + c]) {
        d += `M${x + c * mod} ${y + r * mod}h${mod}v${mod}h${-mod}z`
      }
    }
  }
  return d
}

// ------------------------------------------------------------- receipt mark
// One-color receipt from public/logo.svg. (x, y) = top-left of the paper,
// h = paper height in px.
function receiptMark(x, y, h, paper, detail) {
  const s = h / 284 // paper spans y 116..400 in the 512 viewBox
  return `
  <g transform="translate(${x - 168 * s} ${y - 116 * s}) scale(${s})">
    <g transform="rotate(-8 256 256)">
      <path d="M 178 116 H 334 Q 344 116 344 126 V 372
               L 322 400 L 300 372 L 278 400 L 256 372 L 234 400 L 212 372 L 190 400 L 168 372
               V 126 Q 168 116 178 116 Z" fill="${paper}"/>
      <line x1="206" y1="158" x2="306" y2="158" stroke="${detail}" stroke-width="20" stroke-linecap="round"/>
      <g stroke="${detail}" stroke-width="12" stroke-linecap="round" opacity="0.55">
        <line x1="196" y1="196" x2="278" y2="196"/><line x1="298" y1="196" x2="316" y2="196"/>
        <line x1="196" y1="222" x2="262" y2="222"/><line x1="288" y1="222" x2="316" y2="222"/>
      </g>
      <path d="M 201.9 278.1 A 66 66 0 0 1 310.1 278.1" fill="none" stroke="${detail}" stroke-width="13" stroke-linecap="round" opacity="0.45"/>
      <path d="M 221.6 291.9 A 42 42 0 0 1 290.4 291.9" fill="none" stroke="${detail}" stroke-width="13" stroke-linecap="round" opacity="0.75"/>
      <circle cx="256" cy="316" r="16" fill="${detail}"/>
    </g>
  </g>`
}

// White "receipt" card with a torn bottom edge holding the QR code.
// (x, y, w) = top-left and width of the paper; qrMod = QR module size.
function qrReceipt(x, y, w, qrMod) {
  const qrW = QR_SIZE * qrMod
  const pad = (w - qrW) / 2 // >= 4 QR modules to respect the quiet zone
  const paperH = qrW + pad * 2
  const tooth = 10
  const depth = 8
  const teeth = Math.floor(w / tooth)
  let bottom = ''
  for (let i = 0; i < teeth; i++) {
    const x0 = x + w - i * tooth
    bottom += `L ${x0 - tooth / 2} ${y + paperH + depth} L ${x0 - tooth} ${y + paperH} `
  }
  return `
  <path d="M ${x} ${y} H ${x + w} V ${y + paperH} ${bottom} Z" fill="${WHITE}"/>
  <path d="${qrPath(x + pad, y + pad, qrMod)}" fill="${MAROON}"/>`
}

const TEXT = `font-family:'GeistSticker','Geist',Inter,system-ui,sans-serif`

// --------------------------------------------------------------- round (Ø70)
// Canvas 76×76mm (3mm bleed), die-cut circle Ø70mm centered.
// 10 px per mm.
function roundSVG({ line1, line2 }) {
  const W = 760
  const cx = 380
  const markH = 84
  const wmFont = 58
  // wordmark width estimate for centering: measured empirically for Geist 700
  const wmText = 'tapticket'
  const wmW = wmFont * 0.56 * wmText.length // approx; centered as a group below
  const groupW = markH * 0.62 + 16 + wmW
  const gx = cx - groupW / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="76mm" height="76mm" viewBox="0 0 ${W} ${W}">
  <style>${FONT_CSS}</style>
  <rect width="${W}" height="${W}" fill="${RED}"/>
  ${receiptMark(gx, 92, markH, WHITE, RED)}
  <text x="${gx + markH * 0.62 + 16}" y="${92 + markH * 0.72}" style="${TEXT}"
        font-size="${wmFont}" font-weight="700" letter-spacing="-2.2" fill="${WHITE}">${wmText}</text>
  // QR is 49x49 modules; mod 6.0 -> 294px code, 28px quiet zone each side.
  ${qrReceipt(cx - 175, 208, 350, 6.0)}
  <text x="${cx}" y="612" text-anchor="middle" style="${TEXT}" font-size="34" font-weight="500" fill="${WHITE}">${line1}</text>
  <text x="${cx}" y="652" text-anchor="middle" style="${TEXT}" font-size="34" font-weight="700" fill="${WHITE}">${line2}</text>
  <text x="${cx}" y="700" text-anchor="middle" style="${TEXT}" font-size="26" font-weight="700" letter-spacing="1" fill="${WHITE}" opacity="0.9">tapticket.es</text>
</svg>`
}

// ------------------------------------------------------------- card (85×55)
// Canvas 91×61mm (3mm bleed), rounded-rect cut 85×55mm, r=3mm.
function cardSVG({ line1, line2 }) {
  const W = 910
  const H = 610

  // QR is 49x49 modules; mod 6.0 -> 294px code, 25px quiet zone each side.
  const qrCard = 344
  const qrX = W - 70 - qrCard
  const qrY = (H - qrCard) / 2
  const qrMod = 6.0
  const qrPad = (qrCard - QR_SIZE * qrMod) / 2

  const markH = 92
  const lx = 80

  return `<svg xmlns="http://www.w3.org/2000/svg" width="91mm" height="61mm" viewBox="0 0 ${W} ${H}">
  <style>${FONT_CSS}</style>
  <rect width="${W}" height="${H}" fill="${RED}"/>
  <rect x="${qrX}" y="${qrY}" width="${qrCard}" height="${qrCard}" rx="26" fill="${WHITE}"/>
  <path d="${qrPath(qrX + qrPad, qrY + qrPad, qrMod)}" fill="${MAROON}"/>
  ${receiptMark(lx, 118, markH, WHITE, RED)}
  <text x="${lx + markH * 0.62 + 18}" y="${118 + markH * 0.72}" style="${TEXT}"
        font-size="62" font-weight="700" letter-spacing="-2.4" fill="${WHITE}">tapticket</text>
  <text x="${lx}" y="330" style="${TEXT}" font-size="38" font-weight="500" fill="${WHITE}">${line1}</text>
  <text x="${lx}" y="378" style="${TEXT}" font-size="38" font-weight="700" fill="${WHITE}">${line2}</text>
  <text x="${lx}" y="492" style="${TEXT}" font-size="30" font-weight="700" letter-spacing="1" fill="${WHITE}" opacity="0.9">tapticket.es</text>
</svg>`
}

// ------------------------------------------------------------------ render
async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  for (const [lang, copy] of Object.entries(LANGS)) {
    for (const [fmt, svg] of [
      ['round', roundSVG(copy)],
      ['card', cardSVG(copy)],
    ]) {
      const base = path.join(OUT, `sticker-${fmt}-${lang}`)
      fs.writeFileSync(`${base}.svg`, svg)
      // Exact 300 DPI: round 76mm -> 898px, card 91x61mm -> 1075x720px.
      const px = fmt === 'round' ? { width: 898, height: 898 } : { width: 1075, height: 720 }
      await sharp(Buffer.from(svg), { density: 300 })
        .resize(px.width, px.height, { fit: 'fill' })
        .png()
        .toFile(`${base}.png`)
      const meta = await sharp(`${base}.png`).metadata()
      console.log(`${base}.png  ${meta.width}x${meta.height}px`)
    }
  }
  console.log(`QR (${QR_SIZE}x${QR_SIZE} modules, EC H): ${QR_URL}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
