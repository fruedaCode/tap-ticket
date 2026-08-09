# TapTicket

Scan a receipt, split the bill. Take a photo of a restaurant ticket and AI digitizes every item; share a link and your friends join from their phones to claim or split items in realtime — everyone sees exactly what they owe.

Built as a **Next.js 16 PWA** backed by **Supabase** (Postgres + Auth + Realtime + Storage), with receipt OCR via **Groq's Llama 4 Scout** vision model.

## Prerequisites

- Node.js 22
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key (optional — see `MOCK_SCAN` below)

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run the files in `supabase/migrations/` in filename order, starting with `0001_init.sql`. That first one creates the tables, RLS policies, realtime publication, and the `ticket-images` storage bucket (private, with its access policies) — no manual bucket creation needed. Realtime Authorization (RLS on `realtime.messages` for the private channels the app subscribes to) is handled by the same migration. The later files add settlements, billing and the profile-privacy hardening; the app expects all of them.
3. In **Authentication → Providers**, enable **Google** and **Email** (with email OTP).

## Environment variables

Copy `.env.local.example` to `.env.local` and fill it in:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only, never exposed to the client) |
| `AI_PROVIDER` | Which scanner to use: `groq`, `mistral`, `scaleway` or `ovh`. Defaults to `groq`. See [Receipt scanning providers](#receipt-scanning-providers) |
| `GROQ_API_KEY` | Groq API key for receipt scanning |
| `GROQ_MODEL` | Vision model override, defaults to `qwen/qwen3.6-27b` (Groq retires model IDs often — check their [models page](https://console.groq.com/docs/models) if scans start 404ing) |
| `MISTRAL_API_KEY` / `MISTRAL_MODEL` | Mistral Document AI. Model defaults to `mistral-ocr-latest` |
| `SCALEWAY_API_KEY` / `SCALEWAY_MODEL` / `SCALEWAY_BASE_URL` | Scaleway Generative APIs. Defaults to `mistral-small-3.2-24b-instruct-2506` at `https://api.scaleway.ai/v1` |
| `OVH_API_KEY` / `OVH_MODEL` / `OVH_BASE_URL` | OVHcloud AI Endpoints. Defaults to `Qwen2.5-VL-72B-Instruct` at `https://oai.endpoints.kepler.ai.cloud.ovh.net/v1` |
| `MOCK_SCAN` | Set to `true` to fake scan results in dev — no Groq key needed |
| `LOG_LEVEL` | Server log level: `debug` / `info` / `warn` / `error` (default: `debug` in dev, `info` in prod) |

The server logs its effective configuration at startup (which AI provider, which keys are set — never their values) and every scan pipeline step at `debug` level; failures are always logged with the full error.

## Development

```bash
npm install
npm run dev
```

- Tests: `npm test`
- Production build: `npm run build`

## Deploy to fly.io

The app is built with Next.js standalone output and ships with a multi-stage `Dockerfile` and a ready `fly.toml`.

```bash
fly launch --no-deploy   # or just edit the provided fly.toml
```

1. Set the two `NEXT_PUBLIC_*` values under `[build.args]` in `fly.toml`. Next.js inlines `NEXT_PUBLIC_*` variables into the client bundle at build time, so they must be present during `next build` (as Docker build args), not just at runtime.
2. Set the server-only secrets:

   ```bash
   fly secrets set GROQ_API_KEY=… SUPABASE_SERVICE_ROLE_KEY=…
   ```

3. Deploy:

   ```bash
   fly deploy
   ```

## Receipt scanning providers

Four scanners live behind `AI_PROVIDER` (`lib/ai/index.ts`) so they can be compared on the same
receipts. `groq` is the original, US-hosted; the other three keep receipt images inside the EU,
which removes the international transfer described in `/legal/privacy` §5 altogether.

| `AI_PROVIDER` | Where | Model | API | Indicative cost |
| --- | --- | --- | --- | --- |
| `groq` | 🇺🇸 US | `qwen/qwen3.6-27b` | OpenAI chat completions | per token |
| `mistral` | 🇫🇷 EU | `mistral-ocr-latest` | Document AI (`/v1/ocr`) | $5 / 1000 pages |
| `scaleway` | 🇫🇷 EU (Paris) | `mistral-small-3.2-24b-instruct-2506` | OpenAI chat completions | per token |
| `ovh` | 🇫🇷 EU (France) | `Qwen2.5-VL-72B-Instruct` | OpenAI chat completions | $1.01 / M tokens |

Notes for the comparison:

- The three chat-completions providers send a **byte-identical request** (same prompt, same schema,
  `temperature: 0`) via `lib/ai/openai-compatible.ts`, so differences you see are the model's.
- **Mistral is the odd one out by design.** It uses Document AI's `document_annotation_format`,
  which takes the JSON Schema and answers with conforming JSON — no ` ```json ` fence to unwrap. It
  is sent `strict: false`, because strict mode requires every property to be in `required`, which
  would fill tickets with nulls the others never send. Flip it in `lib/ai/mistral.ts` if you want
  guaranteed conformance and don't mind the nulls.
- **`ovh` is the closest to today's behaviour** — Qwen2.5-VL is the same model family as the Groq
  baseline.
- Watch **latency**, not just accuracy: Groq is unusually fast and the scan screen sits on a
  spinner. Every scan logs `AI scan ok { ms }` at debug level, which is the number to compare.
- Only Mistral publishes a DPA (`mistral.ai/terms`) and states plainly that API data isn't used for
  training. That is the compliance argument for it over the other two.

## Legal & compliance (EU / Spain)

The app ships the technical side of GDPR, ePrivacy, LSSI-CE and EU AI Act transparency:

- **Consent-gated analytics** — PostHog starts opted out (`opt_out_capturing_by_default`), session
  recording is off, and nothing is sent until the banner is accepted. The choice lives in
  `localStorage['tt-consent']` (`lib/consent.ts`) and can be changed any time on `/legal/cookies`.
- **Legal pages** — `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/aviso-legal`, in
  Spanish, English and Catalan. Content is in `lib/legal/{es,en,ca}.tsx`; they are public routes
  (see `PUBLIC_PATHS` in `lib/supabase/session-proxy.ts`) and linked from the landing and login pages.
- **AI transparency** — the scan dialog says AI (Groq) will read the receipt and may be wrong, and
  the ticket screen tells users the items were AI-extracted and are editable (human oversight).
- **Data subject rights** — Account → *Download my data* (`GET /api/account/export`, JSON) and
  Account → *Delete account* (`DELETE /api/account`, which also removes receipt images, settlement
  proofs and the Stripe customer).
- **Data minimization** — migration `0005_profiles_privacy.sql` stops authenticated users from
  reading other people's profile rows (email, `stripe_*`); co-member name/avatar comes from the
  `public_member_profiles` view, restricted to users you actually share a ticket with.

### Before advertising in Spain — operator checklist

These are *not* code, and the app is not compliant until they are done:

1. ~~Fill in `lib/legal/company.ts`~~ — done.
2. **Have the legal pages reviewed by counsel.** The drafts describe this app's actual processing
   accurately, but they are not legal advice.
3. **Get the processor agreements in place** (art. 28(3) requires a written contract with each, and
   art. 30 requires you to be able to show it). See the table below.
4. **Verify the Supabase project region is in the EU** in the dashboard; migrate the project if not.
5. **Set `NEXT_PUBLIC_POSTHOG_HOST` to the EU cloud** (`https://eu.i.posthog.com`) in every
   environment — that is now also the default in both `next.config.ts` and the provider.
6. **Register the privacy contact mailbox** used in the policy and make sure someone reads it
   (one-month response deadline under GDPR art. 12(3)).
7. **Keep a Record of Processing Activities** (GDPR art. 30) — the processors, purposes, legal bases
   and retention periods listed in `/legal/privacy` are the source material for it.

#### Processor agreements

| Provider | What you need to do | Signature required? |
| --- | --- | --- |
| **Groq** (US) | The DPA is incorporated by reference into the Groq Services Agreement — their privacy policy states Customer Data processing is "governed by the Groq Services Agreement and Data Processing Addendum", but no DPA is published on `groq.com/legal`. **Ask Groq in writing** for (a) a copy of the DPA and (b) the Chapter V transfer safeguard they rely on — SCCs, EU–US Data Privacy Framework certification, or both. Their policy invites this ("you may request access to the safeguards used to transfer personal information outside the EEA"). Then pin down the wording in `lib/legal/*.tsx` §5, which currently names both. | Yes — request it |
| **Supabase** | Accept the DPA from the dashboard under the organisation's legal/documents settings; keep their sub-processor list with your art. 30 record. | Self-serve accept |
| **PostHog** | Offers a self-serve DPA you complete with your company details; make sure the project is on **EU Cloud**. | Self-serve accept |
| **Stripe** | The DPA is part of the Stripe Services Agreement you already accepted. Note Stripe is an independent **controller** for much of payment processing, not only a processor — reflect that in your art. 30 record. | Already in force |
| **Fly.io** | Accept/request their DPA; record Paris (`cdg`) as the processing location. | Self-serve accept |
| **Google** | "Sign in with Google" does **not** need a DPA — Google is an independent controller of the user's Google account, and you are bound by the Google API Services User Data Policy instead. Nothing to sign; just keep it disclosed in the privacy policy (it is). | No |

Keep a PDF of each agreement — being able to produce them on request is the point.

## PWA notes

The service worker (`public/sw.js`) only registers in production builds. Bump `CACHE_NAME` in `public/sw.js` on any deploy that changes the app shell, so clients drop stale caches.
