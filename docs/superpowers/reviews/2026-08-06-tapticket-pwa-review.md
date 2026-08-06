# TapTicket PWA — Implementation Review

**Round 1:** 2026-08-06 (plan Tasks 1–10 committed, 11 WIP, 12–18 not started)
**Round 2:** 2026-08-06, after implementation completed through Task 18 — **this document**
**Reviewer:** independent code review (no code changed during either review)

**Scope reviewed:**
- Spec: `docs/superpowers/specs/2026-08-05-tapticket-pwa-design.md`
- Plan: `docs/superpowers/plans/2026-08-05-tapticket-pwa.md`
- All code at commit `10d32c5` (`fix: final review findings`), working tree clean
- Cross-checked against the RN original at `/Users/fernando/development/workspace/personal/ticket-splitter`

**Verification run during this review:**

| Gate | Result |
|---|---|
| `npm test` | ✅ 32 passed / 6 files |
| `npm run build` | ✅ clean — TypeScript passes, 13 routes emitted (`/`, `/account`, `/api/account`, `/api/scan`, `/auth/callback`, `/join`, `/login`, `/manifest.webmanifest`, `/scan`, `/tickets`, `/tickets/[id]`, `/tickets/[id]/edit`, `/_not-found`) + Proxy |
| `docker build` | ⚠️ **not verified** — Docker daemon is not running on this machine |
| Live Supabase run | ✅ **run locally by the developer** against a real Supabase project + real Groq key (`MOCK_SCAN=false`) |

---

## Verdict

Round 1's blocking build failure and all four coded bugs are fixed, and Tasks 11–18 are complete: every spec'd route exists, the PWA layer (manifest, service worker, icons) is in place, and Docker/fly.io config plus a real README are committed. Several fixes went beyond what was asked — storage policies were tightened from member-scope to owner-scope, Realtime Authorization policies were added for private channels, and quantity-0 guards were added to the split library with tests.

**The app is feature-complete against spec and plan, and it runs.** The developer has exercised it locally against a real Supabase project with a real Groq key, so the migration, auth, the scan pipeline and the RLS write-ordering in `/api/scan` are all confirmed working in practice — not just on paper. What remains is a short list of code improvements (§2, §3), two verification gaps that single-machine testing does not reach (multi-account flows and `docker build`, §2.1), and four open decisions (§4).

---

## 1. Round 1 findings — resolution status

| # | Round 1 finding | Status | Where |
|---|---|---|---|
| 2.1 | Build failed: 8 TS errors from `any[]` embed inference | ✅ Fixed | Explicit `TicketListRow` / `TicketListItem` types + `as unknown as Ticket` cast in `lib/queries.ts:5-10,54` |
| 2.2 | Nothing run against a real backend | ✅ Resolved — run locally against a real project (see §2.1 for what local testing does not cover) | `.env.local` holds real credentials as of 2026-08-06 16:41 |
| 3.1 | Scan failure left orphan tickets | ✅ Fixed | `cleanupFailedScan()` in `app/api/scan/route.ts:17-20`, called on all 5 failure branches; storage-remove-before-row ordering is correct given the now owner-only delete policy |
| 3.2 | Success toast was the premium ad string | ✅ Fixed | `'Successfully added'` → `'Ticket añadido con éxito'` in all 3 dicts (`8440e76`) |
| 3.3 | `/api/*` got a 307 to `/login` instead of 401 | ✅ Fixed | `lib/supabase/session-proxy.ts:37-39` returns `401 {error:'unauthorized'}` for `/api` paths |
| 3.4a | `deleteTicket` removed the row before the image | ✅ Fixed | `427e83f` — image first, then row |
| 3.4b | `shareToken()` modulo bias | ⏸️ Not addressed (cosmetic, no action needed) | `app/api/scan/route.ts` |
| 4.1 | List uses `created_at`, RN uses `invoice.date` | ⏸️ **Decision pending** | `app/tickets/page.tsx:32,71,110` unchanged — see §4 |
| 4.2 | List row shows total + your paid; RN shows only yours | ⏸️ **Decision pending** | see §4 |
| 4.3 | `numberToCurrency` EPSILON deviates from RN | ⏸️ **Decision pending** | `lib/currency.ts:2` unchanged — see §4 |
| 4.4 | `isItemPaid` float-tolerance change | ✅ Kept intentionally (improvement) | `lib/split/paid.ts:14` |
| 4.5 | Plan Task 12 missed 4 RN item-dialog details | ✅ All 4 implemented | `components/item-dialog.tsx` — icon-only toggle (`User`/`Users`, lines 153-172), `Remaining: <amount> €` title (93-96,149), live `Total:` line (98-100,183-185), both Split and Unsplit buttons always shown (200-207); plan text patched in `8440e76` |
| 5a | Spec says owner-only ticket update; SQL allows any member | ❌ **Still open** | `supabase/migrations/0001_init.sql:183` — see §4 |
| 5b | `"owners delete ticket images"` policy actually checked membership | ✅ Fixed | Now `is_ticket_owner(name::uuid)` (line 226); upload policy also tightened to owner (line 224) |
| 5c | Only 3 of 7 spec'd routes existed | ✅ Fixed | All 7 exist |
| 5d | README was create-next-app boilerplate | ✅ Fixed | Real setup, env-var table, Supabase steps, fly.io deploy notes |
| 6.1 | Data hooks have no error handling | ⚠️ **Partially** — see §2.2 | `lib/hooks/useTicket.ts`, `lib/hooks/useTicketList.ts` still contain no `catch` |
| 6.2 | Realtime fan-out | ⏸️ Unchanged behaviour, now authorized | Private channels + user-scoped list topic added (`useTicketList.ts:29`) |
| 6.3 | No `onAuthStateChange` listener | ❌ **Still open** — zero occurrences in the codebase | see §3.3 |
| 6.4 | `queries.ts`/`mutations.ts` untyped `SupabaseClient` | ⚠️ Worked around, not fixed | see §2.3 |
| 6.5 | No tests for queries/mutations/RLS/routes | ❌ **Still open** | 32 tests, all still in `lib/split` + `currency` + AI parser |

### Also delivered in this round (not requested in Round 1)

- **Tasks 12–15**: summary page, edit page, scan page, join page, account page, `api/account` (with receipt-image cleanup before `deleteUser`, `app/api/account/route.ts:14-20`), plus `ticket-items`, `item-dialog`, `users-carousel`, `individual-bill`, `tag-dialog`, `share-button`, `language-picker`.
- **Task 16 (PWA)**: `app/manifest.ts`, hand-rolled `public/sw.js` (network-first navigations, cache-first static), `components/service-worker-registration.tsx` wired in `app/layout.tsx:42`, `appleWebApp` metadata, 192/512 icons.
- **Task 17**: `Dockerfile` (multi-stage, standalone), `.dockerignore`, `fly.toml`, `output: "standalone"` in `next.config.ts`.
- **Realtime Authorization**: RLS policies on `realtime.messages` for the `ticket:<uuid>` and `ticket_list:<uuid>` topics (`0001_init.sql:228-244`), matching the `{ config: { private: true } }` channels.
- **`protect_owner_membership` trigger** (`0001_init.sql:249-262`) — stops the owner membership row being deleted while ticket and profile still exist.
- **Quantity-0 guards** in the split library, with 3 new tests (`getUnitPrice`/`getUnitThreshold` return 0 instead of `Infinity`; no `NaN` in `getPercentagePaid`).
- **i18n**: 87 keys, identical key sets across es/en/ca. Every `t()` call site in `app/` and `components/` resolves to an existing key (verified by extraction).

---

## 2. Open items, ranked

### 2.1 Verification gaps that a local single-user run does not close

The app has been run locally against a real Supabase project with a real Groq key, which confirms the parts hardest to get right on paper: the migration applies, auth works, and the `/api/scan` RLS write-ordering plus real Groq inference succeed end to end.

Two things local single-user testing cannot reach, worth an explicit pass before relying on them:

**a) Multi-account and cross-session paths.** `join_ticket` via share link from a second account, `add_member_by_email`, member removal, and — most importantly — **realtime propagating between two sessions**. Both hooks open channels with `{ config: { private: true } }` (`useTicket.ts:23`, `useTicketList.ts:29`), so they depend on the new `realtime.messages` policies (`0001_init.sql:228-244`). Under Realtime Authorization, a topic the policy does not grant simply fails to subscribe — and **neither hook surfaces subscription status**, so dead realtime is indistinguishable from a quiet app when you are the only user. The policies read correctly (the `ticket:` regex guard makes the `::uuid` cast safe, `substring(realtime.topic() from 8)` strips exactly `ticket:`, and the two SELECT policies OR together), but a single-session run would not reveal a failure here.

Concretely: two browsers, two accounts, one ticket — claim an item in A and confirm it appears in B without a reload, and check the console for subscribe errors.

**b) `docker build`.** The daemon is not running on this machine, so the Task 17 Step 4 gate is unconfirmed. One command once Docker is up:

```bash
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
             --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder -t tapticket .
```

### 2.2 Data-hook failures produce misleading UI, plus unhandled rejections

Neither hook has a `catch` (confirmed: zero `catch`/`error` occurrences in `lib/hooks/`). `reload()` is `async` with `try/finally` only, and is called bare inside `useEffect`, so any throw becomes an **unhandled promise rejection**. Consequences:

- **Ticket summary** (`app/tickets/[id]/page.tsx:82-89`): `ticket` stays `null` → renders `t('Invalid link')`. A dropped network connection or an RLS denial is presented to the user as a bad share link.
- **Ticket list** (`app/tickets/page.tsx:101`): `rows` stays `[]` → renders `t('No tickets yet')`. **A load failure is indistinguishable from an empty account** — the worst version of this bug, because the user has no reason to retry.

Add `error` to both hooks' return values, set it in a `catch`, and give each page a distinct error state with a retry affordance. While there, reconsider `t('Invalid link')` as the not-found copy on the summary and edit pages (`app/tickets/[id]/edit/page.tsx:144`) — a dedicated `'Ticket not found'` key would be clearer.

### 2.3 Type safety in the data layer is manual, not structural

The Round 1 build failure was resolved by hand-writing `TicketListRow` / `TicketListItem` and casting: `ticket: m.tickets as unknown as Ticket` (`lib/queries.ts:54`), `items: ((items ?? []) as TicketListItem[])` (line 55). This compiles and the shapes are correct today, but the cast defeats the compiler precisely where the schema meets the code — rename a column in the migration and nothing will complain until runtime.

Durable fix remains: `supabase gen types typescript` from the migration, then `SupabaseClient<Database>` throughout `lib/queries.ts` and `lib/mutations.ts`, and delete the casts.

### 2.4 No tests below the pure-function layer

32 tests, all still covering `lib/split`, `lib/currency`, `lib/ai/parser`. Untested: `lib/queries.ts`, `lib/mutations.ts`, `app/api/scan/route.ts` (including its new 5-branch rollback), `app/api/account/route.ts`, and every RLS policy. The scan route remains the highest-consequence untested code — a rollback that itself fails leaves exactly the orphan state §3.1 was meant to eliminate, and nothing would catch that regression.

---

## 3. New findings from this pass

### 3.1 Service worker cache eviction can evict the app shell

`public/sw.js:56-61` — when the cache exceeds `MAX_CACHE_ENTRIES`, it deletes `keys[0]`. Cache Storage keys are in insertion order, and the three `APP_SHELL` entries (`/manifest.webmanifest`, both icons) are inserted **first** at install. So the first three evictions remove the precached shell rather than the oldest navigation, quietly degrading the offline experience the precache exists to provide. Filter eviction to navigation requests, or keep the shell in a separate cache that is never evicted.

### 3.2 Authenticated page HTML is cached and survives sign-out

`public/sw.js:49-64` caches navigation responses, including authenticated pages, and nothing clears the cache on sign-out. Data risk is low — pages are client components that fetch from Supabase at runtime, so the cached HTML holds no ticket content — but on a shared device the offline fallback (`caches.match('/tickets')`, line 69) can render a previous account's shell. Clearing `CACHE_NAME` in `handleSignOut` (`app/account/page.tsx:78-81`) closes it.

### 3.3 Still no `onAuthStateChange` listener

Confirmed absent across `app/`, `lib/`, `components/`. A sign-out or token revocation in another tab is not reflected until the next navigation reaches the proxy, and an expired refresh token surfaces as the misleading empty/`Invalid link` states of §2.2 rather than as a redirect to `/login`.

### 3.4 `<html lang>` is hard-coded to `es`

`app/layout.tsx:34` pins `lang="es"` while `I18nProvider` can switch the UI to `en`/`ca`. This is what the plan specified, so it is not a deviation — but it misreports the document language to screen readers and translation tooling for non-Spanish users. A one-line effect syncing `document.documentElement.lang` in the provider fixes it.

### 3.5 `fly.toml` ships placeholder build args

`fly.toml` `[build.args]` contains literal `https://<project>.supabase.co` and `<anon key>`. Because Next inlines `NEXT_PUBLIC_*` at build time, deploying as-is produces an image whose client bundle points at a nonexistent Supabase project — and the failure appears at runtime in the browser, not during `fly deploy`. The README documents the step, so this is a documented prerequisite rather than a defect; flagging it because the failure mode is confusing.

### 3.6 Minor

- `'Copy link'` exists in all three dictionaries but is never used — `share-button.tsx:22` only toasts `'Link copied'`. Harmless dead key.
- `components/item-dialog.tsx:89` floors the stepper max (`Math.floor(max + 1e-9)`). Correct for a ±1 stepper, but it means a fractional remainder (e.g. 0.5 units left on a split item) is not claimable from the "my part" view. RN had the same practical limitation with `delta={1}`, so this is parity, not a regression.
- `app/scan/page.tsx:47-51` collapses every non-OK response into `t('Error translating ticket')`. A 413 (image too large) and a 502 (AI failure) are actionable differently; distinguishing at least "too large" would help users.

---

## 4. Decisions still pending (not bugs — your call)

These were raised in Round 1 and are unchanged in the code. Each needs a decision, then either a code change or a note in the spec so the divergence is deliberate and recorded.

1. **List date source.** RN groups *and sorts* by `ticket.invoice.date` (the date printed on the receipt) and omits the year when it is the current year. The port uses `created_at` (`app/tickets/page.tsx:32,71,110`). These diverge whenever a receipt is scanned days after the meal. The plan specified `created_at`.
2. **List row content.** RN shows only *your* paid amount. The port shows ticket total *and* your paid sum. Arguably better; not a mimic.
3. **`numberToCurrency` rounding.** `lib/currency.ts:2` adds `Number.EPSILON`, so `1.005 → "1.01"`; RN yields `"1.00"`. Only exact `.xx5` values differ. Keep it (and drop the plan's "exact port" wording) or match RN.
4. **Who may edit a ticket.** `0001_init.sql:183` grants `"tickets member update"` to every member — any participant can rewrite the restaurant name, invoice fields and totals (identity columns are protected by `protect_ticket_columns`). The spec's RLS section says owner-only. This matches RN's permissiveness and the spec's own reasoning for `ticket_items`; reconcile the two documents either way.

---

## 5. Ship checklist

1. ~~Create the Supabase project, apply the migration, fill `.env.local`~~ — **done**, app runs locally.
2. **Run the two-account half of plan Task 18 Step 4** (§2.1a): share link → second account joins → tag by email → confirm both sessions update live, console clear of realtime subscribe errors.
3. **Run `docker build`** with the placeholder build args (§2.1b), then `fly deploy` with real `[build.args]` and `fly secrets set GROQ_API_KEY=… SUPABASE_SERVICE_ROLE_KEY=…`.
4. **Add error states to both data hooks** (§2.2) — the highest-value code change left, because its absence turns every backend failure into a silent lie about the data.
5. Generate DB types and drop the casts in `lib/queries.ts` (§2.3).
6. Fix SW cache eviction and clear the cache on sign-out (§3.1, §3.2).
7. Add an `onAuthStateChange` listener (§3.3).
8. Settle the four pending decisions in §4 and update spec or code to match.
9. Optional but valuable: integration tests against a local Supabase for the scan route's rollback path and the RLS policies (§2.4).
