# Landing hero: scroll-pinned story

Date: 2026-09-03
Status: approved for planning

## Goal

Replace the current static split hero with a hero that fills the viewport
vertically on desktop and phone and earns a "wow" reaction. The wow comes from a
scroll-pinned story: the hero holds the screen while the visitor's scroll drives
three beats of the product narrative.

Chosen from three directions (cinematic one-shot animation, scroll-pinned story,
playable in-hero demo). Scroll-pinned story was selected.

## Design decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Direction | Scroll-pinned story | Selected by the user over a one-shot animation and a playable demo |
| Beat count | 3 | Mirrors what the product does; ~2 screens of scroll. 4 beats duplicates "How it works" and feels like a hostage situation on mobile |
| Pinning mechanism | CSS `position: sticky` + Motion `useScroll` | No new dependency; the page keeps native scroll speed; avoids mixing GSAP with the Motion already used across this page |
| h1 | Fixed, never swaps | Stable h1 for SEO and screen readers |
| CTAs | Visible in beat 1, never fade | The story is a reward for scrolling, never a prerequisite for finding "Empezar" |
| Header | Transparent overlay on the hero | Lets the hero be a true full screen rather than 100dvh minus header |

## Layout

The hero becomes a tall section containing a sticky wrapper:

```
<section ref>                       h-[300dvh] relative
  <div>                             sticky top-0 min-h-[100dvh] flex items-center
    <div>                           mx-auto max-w-4xl px-4, grid
      left column                   h1 + beat line + CTAs
      right column                  <HeroStory progress={...} />
```

- `h-[300dvh]` means one screen of hero plus two screens of scroll to play the
  story, after which the page continues normally.
- The section is full-bleed; inner content is constrained by `mx-auto max-w-4xl px-4`
  to match the rest of the page.
- The site header moves to `absolute inset-x-0 top-0 z-20` over the hero. Hero
  content uses `pt-24` at most so it does not float down the viewport.
- Desktop: two columns, text left, story right (grid, not flex percentage math).
- Below `sm` (640px): single column. Text block on top, story below it. The story
  is capped at roughly 45% of the sticky wrapper's height on phones so that the
  h1, beat line and both CTAs still fit above it without scrolling.
- Height uses `min-h-[100dvh]`, never `h-screen`, so the iOS address bar does not
  cause a jump.

### Beat 1 must stand alone

At scroll progress 0, without any scrolling, at 390x844 and at 1280x800, all of
these are visible: h1, the beat 1 line, both CTAs, and the story visual. This is
a hard acceptance criterion, not a nice-to-have.

## The three beats

Scroll progress runs 0 to 1 across the section
(`useScroll({ target, offset: ['start start', 'end end'] })`).

| Beat | Progress | Line under the h1 | Illustration state |
| --- | --- | --- | --- |
| 1 | 0.00 - 0.33 | Existing hero subtext | Tilted paper receipt beside an empty phone |
| 2 | 0.33 - 0.66 | "Everyone claims what they had, from their own phone." | Receipt glides into the phone; line items appear and get claimed by three coloured friends |
| 3 | 0.66 - 1.00 | "Then everyone settles up, and nobody is chasing anybody." | Items resolve into three different per-person amounts plus a paid check mark; receipt is gone |

Beat 3 carries no "each pays their own share" wording. That message already
closes the problem section directly below, so the hero states it visually only,
and the words are not repeated.

The three lines are stacked in the same grid cell and crossfade via opacity
driven by `useTransform`. Only one is visible at a time.

## Components

### `components/landing-hero.tsx` (rewritten)

Owns the section element and ref, the sticky wrapper, `useScroll`, the h1, the
crossfading beat lines, and the CTAs. Reads copy through `useI18n`. No props.

### `components/hero-story.tsx` (new)

Owns the artwork. Interface:

```ts
export function HeroStory({ progress }: { progress: MotionValue<number> })
```

It derives every animated property from `progress` with `useTransform` and
renders one inline `<svg role="img" aria-label={...}>` containing motion groups
for the receipt, the phone, the line items, the three friends, and the check
mark. It holds no state and never re-renders on scroll.

Split into two files because a single file carrying layout, copy and a large
inline SVG would be roughly 250 lines doing three jobs.

### `app/page.tsx`

Two structural edits, and nothing else in this file:

- The header moves out of the `max-w-4xl` flow and becomes a transparent overlay
  positioned over the hero.
- `<LandingHero />` moves out of `<main className="... max-w-4xl ...">` so it can
  be full-bleed. The remaining sections stay inside the constrained `main`.

### `public/hero.svg`

Its artwork moves into `hero-story.tsx` as inline SVG so individual groups can
animate. `components/landing-hero.tsx:77` is the only reference in the
repository, so the file is deleted once the component renders inline.

## Motion rules

- Scroll drives styles through MotionValues passed as props. No `useState` for
  continuous values, so scrolling causes zero React re-renders.
- Only `transform` and `opacity` are animated.
- No `window.addEventListener('scroll')`. `useScroll` is the only scroll source.
- No scroll hijacking. The page scrolls at native speed; progress is merely
  mapped onto it.

## Hydration safety

This is a hard requirement, from the mismatch fixed on 2026-09-03 in this same
component.

- No rendered markup may branch on `useReducedMotion()`. That includes `initial`,
  `className`, and any `style` value.
- Under reduced motion the component passes a constant `MotionValue(0)` in place
  of `scrollYProgress`. Both paths render beat 1 at progress 0, so server and
  client markup are identical; the branch only changes what happens after scroll.
- Dropping the pin under reduced motion is done in CSS with Tailwind
  `motion-reduce:` variants (`motion-reduce:h-auto` on the section,
  `motion-reduce:static` on the sticky wrapper), never in JavaScript.

## Accessibility

- Exactly one h1, and its text never changes.
- Beat 1's line is the accessible description. Beats 2 and 3 are `aria-hidden="true"`
  because they are variations of the same message.
- The story SVG uses `role="img"` with a translated `aria-label`, matching
  `public/steps/*.svg` and `public/problems/*.svg`.
- Nothing interactive is added, so no focus traps and no keyboard scroll capture.
- Colour tokens are unchanged, so existing contrast ratios hold.

## i18n

Three new keys, added to `lib/i18n/en.ts`, `es.ts` and `ca.ts`. English strings
are the lookup keys.

| Key (English) | es | ca |
| --- | --- | --- |
| `Everyone claims what they had, from their own phone.` | Cada uno elige lo suyo desde su propio móvil. | Cadascú tria el seu des del seu propi mòbil. |
| `Then everyone settles up, and nobody is chasing anybody.` | Después se salda todo y nadie tiene que perseguir a nadie. | Després es salda tot i ningú no ha de perseguir ningú. |
| `A receipt scanned into a phone, claimed by three friends and settled` | Un ticket escaneado en un móvil, repartido entre tres amigos y saldado | Un tiquet escanejat en un mòbil, repartit entre tres amics i saldat |

Beat 1 reuses the existing subtext key
`Snap a photo, share a link, and friends claim what they had. The math is done for you.`

The old alt-text key `A receipt scanned into a phone where friends split the bill`
becomes unused and is removed from all three dictionaries.

No visible string may contain an em dash or en dash.

## Out of scope

The problem section, the "How it works" section, plans, footer, page metadata and
all legal copy stay untouched. `app/page.tsx` is edited only for the two
structural changes listed above. No new npm dependency. No changes to
`public/steps/*` or `public/problems/*`.

## Verification

1. `npx tsc --noEmit` clean, `npx eslint` no new errors, `npm test` 81/81 passing.
2. CDP probe reports zero hydration errors with reduced motion on and off.
3. Screenshots at 1280x800 and 390x844, each at progress 0, 0.5 and 1, confirming
   the three beats render and are legible.
4. Beat 1 acceptance check: at 390x844 with no scrolling, h1, beat line and both
   CTAs are visible.
5. The `#how-it-works` anchor from the hero CTA still scrolls to the right section
   with the taller hero above it.

## Risks

- A pinned hero means the first scroll gesture does not move the page. Mitigated
  by keeping the story short (~2 screens) and by making beat 1 a complete hero.
  If it still reads as broken in review, the fallback is a full-height hero with
  a one-shot entrance animation and no pin.
- A 300dvh section changes total page length, which affects any scroll-depth
  analytics thresholds already configured in PostHog.
