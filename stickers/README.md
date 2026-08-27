# QR Stickers

Print-ready stickers for handing out in restaurants, matching the Tap Ticket
brand (red `#DC2626`, maroon `#450A0A`, Geist typeface, receipt mark).

## Files

| File                    | Format                          | Language |
| ----------------------- | ------------------------------- | -------- |
| `sticker-round-es.*`    | Round, Ø70 mm die-cut           | Spanish  |
| `sticker-round-ca.*`    | Round, Ø70 mm die-cut           | Catalan  |
| `sticker-round-en.*`    | Round, Ø70 mm die-cut           | English  |
| `sticker-card-es.*`     | Rounded card, 85×55 mm          | Spanish  |
| `sticker-card-ca.*`     | Rounded card, 85×55 mm          | Catalan  |
| `sticker-card-en.*`     | Rounded card, 85×55 mm          | English  |

- `.png` — 300 DPI at final size, 3 mm bleed baked in (round 898×898 px,
  card 1075×720 px). Upload these to the print shop.
- `.svg` — vector masters, in case the shop prefers vector artwork.

## QR code

- Target: `https://tapticket.es/?utm_source=sticker&utm_medium=print&utm_campaign=restaurants`
  (scans show up in PostHog under `utm_source=sticker`).
- Error correction level H (~30% damage tolerance) with a full 4-module
  quiet zone.
- Every PNG is decode-verified after rendering.

## Regenerating

Requires a built app once (the Geist font is read from `.next/static/media/`):

```sh
npm run build        # or `next dev`, just to populate .next/static/media
cd stickers/tools
npm run generate
npm run verify
```

Edit `stickers/tools/generate.mjs` to change the copy, URL, sizes, or colors.
Tooling dependencies (`qrcode`, `jsqr`) are installed in `stickers/tools/`,
isolated from the app's own dependencies.

## Print tips

- Use a die-cut sticker service (StickerMule, StickerApp, …) and set the cut
  line at Ø70 mm (round) or 85×55 mm (card); the bleed is already included.
- Prefer matte or gloss vinyl over paper — stickers in restaurants get wet
  and greasy.
