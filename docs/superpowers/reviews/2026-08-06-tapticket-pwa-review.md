# TapTicket PWA — Implementation Review

**Date:** 2026-08-06
**Reviewer:** independent code review (no code changed during review)
**Scope reviewed:**
- Spec: `docs/superpowers/specs/2026-08-05-tapticket-pwa-design.md`
- Plan: `docs/superpowers/plans/2026-08-05-tapticket-pwa.md`
- All implemented code in this repo (committed through `2ce0529` + 2 untracked WIP files)
- Cross-checked against the RN original at `/Users/fernando/development/workspace/personal/ticket-splitter`

**Verification run during review:** `npm test` → 29 passed / 6 files. `npm run build` → **fails** (8 TS errors, see §2).

---

## Verdict

The spec and plan are a faithful translation of the original request; no misreading of requirements was found. Tasks **1–10 are committed**, **Task 11 is written but uncommitted and does not compile**, **Tasks 12–18 are not started**. The code that exists closely tracks the RN original and is mostly high quality. There is one blocking defect, one real design bug in the scan pipeline, and several RN-parity decisions that need confirming.

---

## 1. Requirement coverage

| Original requirement | Status |
|---|---|
| Next.js PWA (not React Native) | Next 16.3 App Router ✅ — **PWA layer absent**: no manifest, no service worker, not installable (Task 16) |
| Scan ticket with AI, good provider | ✅ Groq + `llama-4-scout-17b-16e-instruct` behind a `TicketScanner` interface, switchable via `AI_PROVIDER`, `MOCK_SCAN` for dev |
| Join via shared link | ✅ `share_token` + `join_ticket()` RPC — **`/join` page not built** |
| Join because registered + someone adds them | ✅ `add_member_by_email()` RPC + `addMemberByEmail` — **`tag-dialog` UI not built** |
| Share the link to the digitized ticket | Backend ready — `share-button.tsx` not built |
| Assign item to you, or partially | ✅ math fully ported and unit-tested (`unit` / `percentage` assignments) — **item dialog UI not built** |
| Mimic the RN implementation | ✅ mostly 1:1 — see §4 |
| No Firebase; Supabase instead | ✅ zero Firebase/RevenueCat references anywhere |
| Deploy as Docker image on fly.io | ❌ not started — no `Dockerfile`, no `fly.toml`, `next.config.ts` still lacks `output: "standalone"` |

Genuine improvement over RN: the AI key is server-side only (`lib/ai/index.ts` is `server-only`, scanning goes through `app/api/scan/route.ts`). RN shipped `EXPO_PUBLIC_TOGETHER_API_KEY` in the app bundle.

---

## 2. Blocking

### 2.1 `npm run build` fails — 8 TypeScript errors

```
app/tickets/page.tsx(32,32): error TS2339: Property 'created_at' does not exist on type 'any[]'.
app/tickets/page.tsx(37,36): error TS2339: Property 'id' does not exist on type 'any[]'.
app/tickets/page.tsx(43,58): error TS2339: Property 'restaurant' does not exist on type 'any[]'.
app/tickets/page.tsx(50,56): error TS2339: Property 'totals' does not exist on type 'any[]'.
app/tickets/page.tsx(71,40): error TS2339: Property 'created_at' does not exist on type 'any[]'.
app/tickets/page.tsx(110,52): error TS2339: Property 'created_at' does not exist on type 'any[]'.
app/tickets/page.tsx(110,85): error TS2339: Property 'created_at' does not exist on type 'any[]'.
app/tickets/page.tsx(112,46): error TS2339: Property 'id' does not exist on type 'any[]'.
```

**Root cause is `lib/queries.ts:35`, not the page.** On an untyped `SupabaseClient`, `select('ticket_id, seen, role, tickets(*)')` infers the embedded relation as `any[]` (cardinality is unknown), so `row.ticket` is typed as an array.

**Fix:** generate DB types from `supabase/migrations/0001_init.sql` (`supabase gen types typescript`) and parameterize `SupabaseClient<Database>` in `lib/queries.ts` and `lib/mutations.ts`. Both files are currently fully untyped; generated types remove this whole class of error. A local narrowing of the embed would unblock the build but leaves the rest untyped.

### 2.2 Nothing has run against a real backend

`.env.local` contains only placeholders. The schema, RLS policies, both RPCs, Realtime, and the storage policies are entirely unverified. `supabase/migrations/0001_init.sql` is the highest-risk file in the repo (recursive-policy hazards, `security definer` helpers, the write-ordering constraints the scan route works around). Task 18's manual smoke checklist has not been executed.

---

## 3. Real bugs in committed code

### 3.1 Orphaned tickets on scan failure — `app/api/scan/route.ts:28-53`

The route inserts the ticket row, inserts owner membership, and uploads the image **before** calling the AI. If the scan throws (the 502 branch), all three writes remain. The user gets a permanent ghost ticket with `restaurant: {}`, `totals: {}`, `img_path: ''` and zero items, indistinguishable from a real one in the list. The RN app only persisted after inference succeeded.

The write ordering itself is forced by RLS and is correct — the missing piece is a rollback on the failure path (delete the ticket row; cascades clean up members/items) plus removal of the uploaded object. Apply the same treatment to the later failure branches (`updateError`, `itemsError`), which currently also abandon a half-built ticket.

### 3.2 The scan success toast is a premium ad — `lib/i18n/{es,en,ca}.ts`

`'Successfully added'` was ported verbatim from RN, where its value is:

> *"Ten en cuenta que esta versión gratuita de la aplicación tiene una precisión limitada para el escaneo de tickets de restaurante. Para una mayor precisión, considera actualizar a nuestra versión premium."*

Monetization was explicitly dropped, yet plan Task 14 prescribes `toast.success(t('Successfully added'))` after a scan. The intended key is `'Success'` → `'Agregado con éxito'`. Present in all three dictionaries; either repoint Task 14 to `'Success'` or rewrite the `'Successfully added'` values.

### 3.3 API routes sit behind the HTML auth guard — `proxy.ts:10`

The matcher covers `/api/*`, so an unauthenticated `POST /api/scan` receives a 307 to `/login` and the client gets HTML back. The route's own `401 {error:'unauthorized'}` is unreachable. Exclude `/api` from the redirect branch (or return 401 for `/api` paths) so client error handling can distinguish auth failure from scan failure.

### 3.4 Minor

- `deleteTicket` (`lib/mutations.ts:62`) deletes the DB row before the storage object; a failed `remove()` orphans the image in a private bucket with no lifecycle rule. Remove the object first, or tolerate/report the failure.
- `shareToken()` (`app/api/scan/route.ts:9`) has slight modulo bias (`b % 62` over 0–255). Harmless for a 20-char token; noted only for completeness.

---

## 4. RN parity

### Verified 1:1 (no action needed)

- `services/utils/ticket-utils.ts` → `lib/split/*`: `getFinalPrice`, `getPercentagePaid`, `getUnitThreshold`, `getUnitPrice`, `calculateMaxUnitsAvailable`, `calculateMaxPercentageAvailable`, `groupItemsByUser` (RN's `groupItemsByEmail`, rekeyed from `email` to `user_id`).
- AI prompt string and `RESPONSE_SCHEMA` are byte-for-byte RN's (`services/ai/InferenceService.ts`, `services/types.ts`).
- `parseScanResponse` is a faithful port of RN's `convertResponse` / `sanitizeString` (`services/ai/OpenAI.ts`).
- Provider swap Together AI / `Llama-Vision-Free` → Groq / `llama-4-scout`, same `temperature: 0` and `top_p: 0.7`.
- i18n: `es`/`en`/`ca` all have identical 76-key sets. 4 premium/contact keys dropped, 16 added. `ca` is now more complete than RN's original (which had only 28 keys).

### Divergences — decide and reconcile

1. **Ticket list uses the wrong date.** RN groups *and sorts* by `ticket.invoice.date` (the date printed on the receipt) and omits the year when it equals the current year — see `app/(authenticated)/(tabs)/tickets/index.tsx:45-50` in the RN repo. The port uses `created_at` (`app/tickets/page.tsx:71` and `:110`). These differ whenever a receipt is scanned days later. The plan specified `created_at`, so this is a plan-level decision, not an implementation slip.
2. **List row shows more than RN.** RN's row shows only *your* paid amount on the right. The port shows ticket total *and* your paid sum. Arguably better, but not a mimic.
3. **`numberToCurrency` is not the "exact port" the plan claims.** `lib/currency.ts:2` adds `Number.EPSILON`, so `1.005 → "1.01"`; RN's `Math.round(num*100)/100` yields `"1.00"`. The plan's own test forced this. Only affects exact `.xx5` values — but the plan text should stop claiming exactness.
4. **`isItemPaid` semantics changed, for the better.** RN's `getFinalPrice(item) === getFinalPrice(item) * getPercentagePaid(item)` misreports a fully-assigned quantity-6 item as unpaid due to float summation; the port's `|1 - pct| < 1e-9` fixes it (regression test at `tests/split/paid.test.ts:32`). Side effect: RN returns `true` for a zero-price item, the port returns `false`, so a free item never renders as paid. `getTicketPaidPercentage` also gained a divide-by-zero guard (RN returns `NaN` for an empty ticket). `clampZero` in `lib/split/max.ts` is a further addition preventing negative maxima. All three are improvements — keep them, but record them as intentional.
5. **Plan Task 12's item-dialog spec is incomplete.** Checked against RN `components/tickets/ItemPressDialogContent.tsx` and `ItemPaymentTypeToggle.tsx`:
   - RN's view toggle is **icon-only** (`person-outline` / `people-outline`), not the `t('Units')` / `t('Percentage')` text labels the plan prescribes.
   - RN's dialog **title** is `` `${t('Remaining')}: ${numberToCurrency(maxAvailable × unitPrice)}€` `` (percentage view uses `maxPercentage × item.price`).
   - RN shows **both** Split and Unsplit buttons unconditionally in the Split view; the plan hides Unsplit unless `split_among > 0`.
   - RN renders a live `` `${t('Total')}: ${amount × (unit ? unitPrice : item.price)}€` `` line above Save; the plan omits it.
   - RN's input mode follows `currentPayer.paymentType` (not the toggle), and switching payment type converts the amount via `getUnitThreshold` — the plan captures this correctly.

   This dialog is the core interaction of the app; patch the plan before building it.

---

## 5. Spec ↔ implementation drift

- **Ticket update rights.** Spec §RLS says `tickets` update/delete = owner. `0001_init.sql` grants `"tickets member update"` to every member, relying on the `protect_ticket_columns` trigger to guard `id` / `owner_id` / `share_token`. So any member can rewrite the restaurant name and totals. This matches RN's permissiveness and the spec's own `ticket_items` reasoning, but contradicts the spec text. Pick one and update the other.
- **Storage delete policy is misnamed and over-permissive.** The policy called `"owners delete ticket images"` actually checks `is_ticket_member(name::uuid)`, so any member can delete the receipt photo. Probably not intended given the name.
- **Routes.** Spec lists 7 pages; 3 exist (`/login`, `/tickets`, plus the `/` redirect and `/auth/callback`).
- **README.** Still the `create-next-app` boilerplate. The Supabase setup procedure (apply the migration, enable Google + email OTP) is promised in Task 17 Step 3 and exists nowhere else.

---

## 6. Quality notes (non-blocking)

- **No error states in the data hooks.** If `fetchTicketDetail` throws — a non-member opening a ticket URL, network failure — `lib/hooks/useTicket.ts:12-18` clears `loading` and leaves `ticket` as `null`, so the page renders blank with no message. Same in `useTicketList`. Every consumer will need an error branch that does not currently exist.
- **Realtime fan-out.** `item_assignments` is subscribed unfiltered (documented as intentional and correct at this scale), but `useTicketList` also subscribes to *all* `tickets` and `ticket_members` events, each triggering a full multi-query refetch. Fine for a handful of users; watch it if the app grows.
- **No `onAuthStateChange` listener,** so a sign-out in another tab is not reflected until the next navigation hits the proxy.
- **Test coverage is exactly the plan's scope** (split lib, currency, AI parser — 29 tests). Nothing covers `queries.ts`, `mutations.ts`, the RLS policies, or the scan route. The scan route's RLS-ordering sequence is the most fragile code in the repo and is untested.

---

## 7. Recommended order to resume

1. Fix the `lib/queries.ts` typing (preferably via generated DB types) so `npm run build` is green, then commit Task 11 (`app/tickets/page.tsx`, `components/bottom-nav.tsx`).
2. Wire a real Supabase project and apply `supabase/migrations/0001_init.sql`. Until RLS / RPCs / Realtime are exercised, every later task builds on unverified foundations.
3. Add the scan-failure rollback (§3.1) and fix the success-toast string (§3.2).
4. Patch plan Task 12 with the four RN dialog details (§4.5), then build the summary screen and item dialog.
5. Decide the two parity questions — `invoice.date` vs `created_at` for the list, and member-vs-owner ticket edit rights — and reconcile spec, migration, and code.
6. Continue with Tasks 13–17 (edit, scan, join/account, PWA, Docker/fly.io/README) and finish with Task 18's verification gates: `npm test`, `npm run build`, `docker build`, manual smoke.
