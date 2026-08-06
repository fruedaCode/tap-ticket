# TapTicket PWA — Design

**Date:** 2026-08-05
**Status:** Approved by user
**Source:** Port of the React Native/Expo app at `../ticket-splitter` ("TapTicket") to a Next.js Progressive Web App.

## Goal

A PWA where a user photographs a restaurant receipt, AI digitizes it into structured items, and a group of people split the bill: each person assigns whole items or partial shares to themselves. Tickets are shared via link or by adding a registered user by email.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| AI provider | Groq (Llama 4 Scout vision) behind a provider interface, switchable via env |
| Auth | Supabase Auth: Google OAuth + email OTP (passwordless) |
| Adding registered users | By email (owner types a registered user's email); share link for everyone else |
| Monetization | Dropped (no ads, no premium tier, no PRO model toggle) |
| Phone verification / contacts | Dropped |
| Languages | es (default), en, ca — ported from the RN app's i18next resources |
| Backend | Supabase (Postgres + RLS + Storage + Realtime). No Firebase anywhere. |
| Deploy | Docker image (Next standalone output) on fly.io |

## Architecture

Next.js 15 App Router + TypeScript. UI: Tailwind CSS + shadcn/ui. No Redux — data access via Supabase client queries + Realtime subscriptions in hooks, server components where practical.

Server-side secrets (`GROQ_API_KEY`, Supabase service key if needed) live only in Route Handlers. The RN app shipped AI keys in the app bundle; the PWA fixes this by scanning through `POST /api/scan`.

### Pages (mirroring RN routes)

| Route | RN equivalent | Purpose |
|---|---|---|
| `/login` | `(00_unauthenticated)/index` | Google + email OTP login |
| `/tickets` | `(tabs)/tickets/index` | Ticket list grouped by month, per-user paid sums, unseen badge |
| `/tickets/[id]` | `[id]/summary` | Main screen: image header, items, user carousel, per-user bill, Share/Tag, item assign/split dialog |
| `/tickets/[id]/edit` | `[id]/details` | Edit restaurant/invoice/items/totals, delete ticket |
| `/scan` | `(tabs)/import` | Photo capture (`<input type="file" accept="image/*" capture="environment">`), preview, upload, progress, redirect to new ticket |
| `/join` | `load-shared-ticket` | Share-link landing: `?ticketId&token`; bounces to login and returns |
| `/account` | `(tabs)/account` | Profile, language picker, sign out, delete account |

### Scanning pipeline

1. Client captures photo, previews, confirms.
2. `POST /api/scan` with the image (multipart).
3. Server: uploads image to Supabase Storage bucket `ticket-images/{ticketId}`, sends base64 to the AI provider, parses the JSON response, inserts ticket + items + owner membership, returns `{ ticketId }`.
4. Client redirects to `/tickets/{ticketId}`.

### AI layer

`lib/ai/`:
- `types.ts` — `InferredTicket` schema (ported from RN `services/types.ts`): `restaurant{name,address,phone,NIF}`, `invoice{type,operation_number,table,date,cashier}`, `items[{quantity,description,unitPrice,price,discount_percentage,discount_amount}]`, `totals{base,tax{percentage,amount},total_without_tax,total_with_tax}`; plus `TicketScanner` interface: `scan(image: {base64, mediaType}): Promise<InferredTicket>`.
- `groq.ts` — Groq provider (OpenAI-compatible chat completions, model `meta-llama/llama-4-scout-17b-16e-instruct`, temperature 0). Ports the exact RN prompt (date-format hints, optional discount fields, ```` ```json ```` fenced output) and the response parser (fence regex extraction, European decimal `,`→`.` sanitization).
- `index.ts` — `getScanner()` picks provider from `AI_PROVIDER` (default `groq`).

### Data model (Postgres)

```sql
profiles        (id uuid pk = auth.users.id, email text, display_name text, photo_url text)
tickets         (id uuid pk, owner_id uuid -> profiles, share_token text unique,
                 restaurant jsonb, invoice jsonb, totals jsonb,
                 img_path text, created_at timestamptz)
ticket_items    (id uuid pk, ticket_id -> tickets on delete cascade, position int,
                 quantity numeric, description text, price numeric,
                 discount_percentage numeric, discount_amount numeric, split_among int default 0)
item_assignments(id uuid pk, item_id -> ticket_items on delete cascade, user_id -> profiles,
                 payment_type text check in ('unit','percentage'), amount numeric,
                 unique(item_id, user_id))
ticket_members  (ticket_id -> tickets on delete cascade, user_id -> profiles,
                 role text check in ('owner','member'), seen boolean default false,
                 primary key (ticket_id, user_id))
```

- `profiles` auto-created by trigger on `auth.users` insert.
- Share token: 20-char random `[A-Za-z0-9]` (same format as the RN app), generated server-side at scan time.

**RPCs (security definer):**
- `join_ticket(p_ticket_id uuid, p_token text)` — validates `share_token`, inserts caller into `ticket_members` (role `member`) and adds a default assignment (amount 0; `percentage` if `split_among > 0` else `unit`) on every item lacking one. Idempotent: if already a member, no-op success.
- `add_member_by_email(p_ticket_id uuid, p_email text)` — caller must be a member; looks up profile by email; inserts membership + default assignments. Errors if email not registered.

**RLS:**
- `profiles`: any authenticated user can read (needed for member display); users update only their own row.
- `tickets`: select = caller is a member; insert = authenticated (owner_id = caller); update = any member (content columns only — a trigger protects id/owner_id/share_token); delete = owner.
- `ticket_items`, `item_assignments`: select = caller is member of the parent ticket; insert/update/delete = caller is member of the parent ticket (mirrors the RN model where every participant edits assignments).
- `ticket_members`: select = caller is member of that ticket; no direct client insert/update/delete except marking own `seen` (RPCs handle membership changes).

**Realtime:** enabled on `tickets`, `ticket_items`, `item_assignments`, `ticket_members`. The ticket detail page subscribes to changes for its ticket id; the list page refetches on membership changes.

**Storage:** bucket `ticket-images`, private. Path `{ticketId}` (no extension, like the original). Reads via signed URLs (1h) generated server-side or client SDK. The AI never needs a public URL (base64 is sent directly).

### Split logic (ported 1:1 from `services/utils/ticket-utils.ts`)

Pure functions in `lib/split/`, TDD with vitest:

- `getFinalPrice(item)` — `price - discount_amount` if amount > 0, else `price * (1 - discount_percentage/100)` if percentage > 0, else `price`.
- `PaymentType.Unit` — `amount` = units consumed; fraction = `amount / quantity`.
- `PaymentType.Percentage` — `amount` = 0..1 fraction of final price.
- `getPercentagePaid(item, assignments, userId?)` — Σ fractions (optionally for one user).
- `calculateMaxUnitsAvailable(item, assignments)` = `quantity - getPercentagePaid() * quantity`; `calculateMaxPercentageAvailable` = `1 - getPercentagePaid()`.
- Split N: sets `split_among = N`, converts all assignments to `percentage`, selected user gets `1/N`, others 0. Unsplit: `split_among = 0`, assignments back to `unit`.
- `isItemPaid` — final price fully covered (≥ 1 fraction).
- `getTicketPaidPercentage(items, assignments)` — paid Σ / totals Σ.
- `groupItemsByUser(items, assignments)` — per-user bill lines `{description, amount, unit}` + total; mirrors `groupItemsByEmail`/`IndividualBill`.
- `numberToCurrency(n, locale)` — 2 decimals, comma separator in es/ca, `€` suffix.

### Auth flows

- `/login` — Google OAuth (`signInWithOAuth`, redirect to `/auth/callback`) + email OTP (`signInWithOtp`, code entry on page).
- `/auth/callback` — exchanges code for session (Route Handler).
- Middleware refreshes session and guards: unauthenticated → `/login?next=<path>`; `/join` preserves its query params through the bounce.
- Delete account: Route Handler using service role deletes the auth user; cascades clean up rows.

### PWA

Hand-rolled service worker: `public/sw.js` registered by the `ServiceWorkerRegistration` client component. `@ducanh2912/next-pwa` was dropped because it is incompatible with Next.js 16 / Turbopack. Web manifest via `app/manifest.ts` (name TapTicket, theme color, 192/512 icons, `display: standalone`), offline app shell, installable on iOS/Android. Camera via file input `capture="environment"` (most reliable cross-browser; no getUserMedia viewfinder).

### Deployment

- `Dockerfile`: multi-stage — deps → build (`output: "standalone"`) → slim runner on `node:22-alpine`.
- `fly.toml`: app config, internal port 3000, auto-scaling defaults; secrets via `fly secrets set` (Supabase URL/keys, Groq key).
- Supabase schema as SQL files in `supabase/migrations/`, applied with `supabase db push` or pasted in the SQL editor; `.env.local.example` documents all vars.

## Explicitly out of scope (YAGNI)

Ads, RevenueCat/premium, PRO model toggle, phone verification, device contacts sync, WhatsApp messaging, admin functions, migrations runner, push notifications, the marketing landing site.

## Testing

- vitest unit tests for every `lib/split` function (written first, TDD), including the exact rounding/currency cases from the RN app.
- vitest tests for the AI response parser: fenced JSON, unfenced fallback, European decimals, malformed input.
- Verification gates: `npm run test`, `npm run build`, `docker build` all green before done.
