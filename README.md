# TapTicket

Scan a receipt, split the bill. Take a photo of a restaurant ticket and AI digitizes every item; share a link and your friends join from their phones to claim or split items in realtime — everyone sees exactly what they owe.

Built as a **Next.js 16 PWA** backed by **Supabase** (Postgres + Auth + Realtime + Storage), with receipt OCR via **Groq's Llama 4 Scout** vision model.

## Prerequisites

- Node.js 22
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key (optional — see `MOCK_SCAN` below)

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run the full contents of `supabase/migrations/0001_init.sql`. This creates the tables, RLS policies, realtime publication, and the `ticket-images` storage bucket (private, with its access policies) — no manual bucket creation needed. Realtime Authorization (RLS on `realtime.messages` for the private channels the app subscribes to) is handled by the same migration.
3. In **Authentication → Providers**, enable **Google** and **Email** (with email OTP).

## Environment variables

Copy `.env.local.example` to `.env.local` and fill it in:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only, never exposed to the client) |
| `GROQ_API_KEY` | Groq API key for receipt scanning |
| `AI_PROVIDER` | AI provider, defaults to `groq` |
| `MOCK_SCAN` | Set to `true` to fake scan results in dev — no Groq key needed |

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

## PWA notes

The service worker (`public/sw.js`) only registers in production builds. Bump `CACHE_NAME` in `public/sw.js` on any deploy that changes the app shell, so clients drop stale caches.
