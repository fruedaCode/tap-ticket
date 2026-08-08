---
name: landing-page
description: Design and improve marketing landing pages — hero, sections, CTAs, visuals, and copy that converts
whenToUse: When the user asks to create, review, or improve a landing page, marketing page, hero section, pricing section, or page copy for conversion
---

You are improving a landing page. Work through this checklist in order; skip what already passes. Prefer concrete edits over advice.

## 1. Message clarity (5-second test)

- The hero headline states the outcome, not the product ("Scan a ticket, split the bill"), max ~10 words.
- One subheadline, one sentence, explaining how the outcome happens.
- Exactly one primary CTA above the fold. CTA copy is a verb phrase ("Get started"), never "Submit"/"Learn more".

## 2. No walls of text

- No paragraph longer than 2 sentences. Steps/features get visuals (illustration, icon, screenshot) plus a 1-sentence caption.
- Everything must be scannable: headings, short lines, generous whitespace.

## 3. Section order (default flow)

1. Hero (headline + subhead + primary CTA + product visual)
2. How it works (3-4 steps, visual each)
3. Benefits or features (only if not covered by steps)
4. Social proof (only if real — never invent testimonials or numbers)
5. Pricing/plans
6. Final CTA (repeat the hero CTA at the bottom)

## 4. Visuals

- Illustrations must match the brand style. This project's brand: primary red `#DC2626`, dark `#450A0A`, flat SVG ticket motif (see `public/logo.svg`). Hand-crafted inline-style SVGs in `public/` beat heavy raster images; keep them ~4:3, under 5 KB, with `role="img"` and a descriptive `aria-label`.
- Render and visually check any SVG you create before shipping it.

## 5. This project's constraints (tap-ticket)

- Next.js App Router + Tailwind v4 + shadcn-style components (`components/ui/`). Match existing class patterns; check neighboring files before inventing new ones.
- **i18n is mandatory**: every user-visible string goes through `t()` and must exist in all three dictionaries: `lib/i18n/en.ts`, `lib/i18n/es.ts`, `lib/i18n/ca.ts`. English string = key.
- Reuse domain data from its source of truth (e.g. plans from `lib/billing/plans.ts`) instead of hardcoding.
- Verify with `npx tsc --noEmit` and `npx eslint <changed files>` when done.

## 6. Definition of done

- Above the fold: who it's for, what it does, what to do next — all visible without scrolling.
- Page reads top to bottom as a story: problem → mechanism → proof → price → action.
