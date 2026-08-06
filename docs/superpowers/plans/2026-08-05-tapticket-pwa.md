# TapTicket PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js PWA port of the TapTicket React Native app: scan a restaurant receipt with AI, split items among people (whole or partial), share tickets via link or email invite.

**Architecture:** Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui frontend; Supabase (Postgres+RLS, Auth, Storage, Realtime) backend; server-side AI scanning via a provider abstraction defaulting to Groq (Llama 4 Scout vision). Deployed as a Docker image on fly.io.

**Tech Stack:** Next.js 16 (scaffolded version — see note), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, @supabase/ssr + @supabase/supabase-js, Groq API (OpenAI-compatible), vitest, hand-rolled service worker (see Task 16 amendment), Docker, fly.io.

> **Next.js 16 amendment (post-scaffold):** the scaffold produced Next.js **16.3.0**, not 15. Two plan changes:
> 1. `middleware.ts` is deprecated — use **`proxy.ts`** exporting `export async function proxy(request: NextRequest)` (same `config.matcher` export). Task 6 file list changes accordingly: `proxy.ts` instead of `middleware.ts`, and `lib/supabase/middleware.ts` keeps its name but is imported by `proxy.ts`.
> 2. `@ducanh2912/next-pwa` relies on webpack; Next 16 builds with Turbopack by default. Task 16 is amended to a **hand-rolled service worker** (`public/sw.js` + a small client-side registration component) — no webpack dependency, no build friction.
> Bundled docs for any doubt: `node_modules/next/dist/docs/` (e.g. `01-app/03-api-reference/03-file-conventions/proxy.md`). Dynamic route `params` are async: in client components use `useParams()` from `next/navigation`.

**Spec:** `docs/superpowers/specs/2026-08-05-tapticket-pwa-design.md`

**Reference source (read-only):** the original RN app lives at `/Users/fernando/development/workspace/personal/ticket-splitter`. Key files when in doubt: `services/utils/ticket-utils.ts` (split math), `services/types.ts` (domain types + AI response schema), `services/ai/InferenceService.ts` + `services/ai/OpenAI.ts` (prompt + parser), `configuration/i18n/{es,en,ca}.ts` (translations).

**Conventions:**
- Language/locale for UI strings: i18n dict keys are the **Spanish source strings** (same convention as the RN app: `keySeparator: false`, literal `'My tickets'` key).
- Money: `numberToCurrency(n, lang)` — 2 decimals, comma separator when lang !== 'en', ` €` suffix added by callers (same as RN).
- All DB writes from the browser use the user-JWT Supabase client (RLS enforced). The only server-role usage is account deletion. AI key never leaves the server.
- Commits after every task (`feat:`/`test:`/`chore:` messages).

---

## File structure

```
app/
  layout.tsx                    Root layout: html lang, PWA metadata, I18nProvider, Toaster
  page.tsx                      Redirect / -> /tickets
  globals.css
  login/page.tsx                Google + email OTP login
  auth/callback/route.ts        OAuth code exchange
  tickets/page.tsx              Ticket list (month groups)
  tickets/[id]/page.tsx         Summary (main screen) — client component
  tickets/[id]/edit/page.tsx    Edit form + delete
  scan/page.tsx                 Camera capture + upload
  join/page.tsx                 Share-link landing
  account/page.tsx              Profile, language, sign out, delete account
  api/scan/route.ts             POST image -> AI -> DB -> {ticketId}
  api/account/route.ts          DELETE -> admin deleteUser
components/
  ui/                           shadcn primitives (button, input, dialog, avatar, select, sonner…)
  app-header.tsx
  bottom-nav.tsx                tickets / scan / account
  ticket-items.tsx              items list (read mode w/ paid styling)
  item-dialog.tsx               assign "my part" / split dialog
  users-carousel.tsx            avatar row to pick payer
  individual-bill.tsx           per-user bill lines + total
  tag-dialog.tsx                add member by email
  share-button.tsx
  language-picker.tsx
lib/
  types.ts                      domain + DB types
  currency.ts                   numberToCurrency, numberToPercentage
  i18n/                         es.ts en.ts ca.ts + provider.tsx (React context, localStorage persist)
  split/                        price.ts paid.ts max.ts bill.ts (pure functions)
  ai/types.ts ai/parser.ts ai/groq.ts ai/mock.ts ai/index.ts
  supabase/client.ts server.ts middleware.ts
  queries.ts                    fetchTicketDetail, fetchTicketList
  mutations.ts                  setItemAmount, splitItem, unsplitItem, updateTicket, deleteTicket, removeMember, markSeen
  hooks/useTicket.ts useTicketList.ts
middleware.ts                   session refresh + auth guard
supabase/migrations/0001_init.sql
tests/                          vitest mirrors of lib
Dockerfile fly.toml .env.local.example
```

---

## Task 1: Project scaffold

**Files:**
- Create: whole Next.js app skeleton + config

- [ ] **Step 1: Scaffold**

```bash
cd /Users/fernando/development/workspace/personal/tap-ticket
npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --turbopack --yes
git init
```

- [ ] **Step 2: Install dependencies**

```bash
npm i @supabase/supabase-js @supabase/ssr
npm i -D vitest @vitejs/plugin-react
npx shadcn@latest init -y -d   # defaults: new-york, zinc, css vars
npx shadcn@latest add button input dialog avatar select separator skeleton sonner carousel label
```

- [ ] **Step 3: Configure vitest**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with supabase, shadcn, vitest"
```

---

## Task 2: Domain types + currency utils (TDD)

**Files:**
- Create: `lib/types.ts`, `lib/currency.ts`
- Test: `tests/currency.test.ts`

- [ ] **Step 1: Write `lib/types.ts`**

```ts
export type PaymentType = 'unit' | 'percentage'

// ---- AI inference result (ported from RN services/types.ts) ----
export type Restaurant = { name: string; address: string; phone: string; NIF: string }
export type Invoice = { type: string; operation_number: string; table: string; date: string; cashier: string }
export type InferredItem = {
  quantity: number
  description: string
  unitPrice?: number | null
  price: number
  discount_percentage?: number | null
  discount_amount?: number | null
}
export type Totals = { base: number; tax: { percentage: number; amount: number }; total_without_tax: number; total_with_tax: number }
export type InferredTicket = { restaurant: Restaurant; invoice: Invoice; items: InferredItem[]; totals: Totals }

// ---- DB rows ----
export type Profile = { id: string; email: string; display_name: string | null; photo_url: string | null }
export type Ticket = {
  id: string
  owner_id: string
  share_token: string
  restaurant: Restaurant
  invoice: Invoice
  totals: Totals
  img_path: string
  created_at: string
}
export type TicketItem = {
  id: string
  ticket_id: string
  position: number
  quantity: number
  description: string
  price: number
  discount_percentage: number
  discount_amount: number
  split_among: number
}
export type ItemAssignment = {
  id: string
  item_id: string
  user_id: string
  payment_type: PaymentType
  amount: number
}
export type MemberRole = 'owner' | 'member'
export type TicketMember = { ticket_id: string; user_id: string; role: MemberRole; seen: boolean }

// ---- View models ----
export type TicketItemWithAssignments = TicketItem & { assignments: ItemAssignment[] }
export type MemberWithProfile = TicketMember & { profile: Profile }
export type TicketDetail = Ticket & { items: TicketItemWithAssignments[]; members: MemberWithProfile[] }
```

- [ ] **Step 2: Write failing test `tests/currency.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { numberToCurrency, numberToPercentage } from '@/lib/currency'

describe('numberToCurrency', () => {
  it('uses dot decimals for en', () => expect(numberToCurrency(12.5, 'en')).toBe('12.50'))
  it('uses comma decimals for es', () => expect(numberToCurrency(12.5, 'es')).toBe('12,50'))
  it('uses comma decimals for ca', () => expect(numberToCurrency(3.456, 'ca')).toBe('3,46'))
  it('rounds half up to 2 decimals', () => expect(numberToCurrency(1.005, 'en')).toBe('1.01'))
  it('handles zero', () => expect(numberToCurrency(0, 'es')).toBe('0,00'))
})

describe('numberToPercentage', () => {
  it('converts fraction to integer percent with unit', () => expect(numberToPercentage(0.5, '%')).toBe('50%'))
  it('converts fraction to integer percent without unit', () => expect(numberToPercentage(0.25)).toBe(25))
})
```

- [ ] **Step 3: Run, verify fail** — `npm test` → cannot resolve `@/lib/currency`.

- [ ] **Step 4: Implement `lib/currency.ts`** (exact port of RN `number-utils.ts` behavior)

```ts
export function numberToCurrency(num: number, lang: string): string {
  const fixed = (Math.round(num * 100) / 100).toFixed(2)
  return lang === 'en' ? fixed : fixed.replace('.', ',')
}

export function numberToPercentage(num: number, unit?: string): string | number {
  return unit ? `${Math.round(num * 100)}${unit}` : Math.round(num * 100)
}
```

- [ ] **Step 5: Run, verify pass** — `npm test` green.

- [ ] **Step 6: Commit** — `feat: domain types and currency utils`

---

## Task 3: Split logic library (TDD, core port)

**Files:**
- Create: `lib/split/price.ts`, `lib/split/paid.ts`, `lib/split/max.ts`, `lib/split/bill.ts`, `lib/split/index.ts`
- Test: `tests/split/price.test.ts`, `tests/split/paid.test.ts`, `tests/split/max.test.ts`, `tests/split/bill.test.ts`

These are exact ports of RN `services/utils/ticket-utils.ts`, adapted: `item.paidBy` arrays become separate `ItemAssignment[]` lists keyed by `user_id` instead of `email`.

- [ ] **Step 1: Write failing tests**

`tests/split/price.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { getFinalPrice, getUnitPrice, getUnitThreshold } from '@/lib/split'

const base = { quantity: 2, price: 10, discount_percentage: 0, discount_amount: 0 }

describe('getFinalPrice', () => {
  it('returns price when no discount', () => expect(getFinalPrice(base)).toBe(10))
  it('subtracts discount_amount first', () =>
    expect(getFinalPrice({ ...base, discount_amount: 3, discount_percentage: 50 })).toBe(7))
  it('applies discount_percentage when no amount', () =>
    expect(getFinalPrice({ ...base, discount_percentage: 10 })).toBe(9))
})
it('getUnitPrice divides by quantity', () => expect(getUnitPrice(base)).toBe(5))
it('getUnitThreshold is 1/quantity', () => expect(getUnitThreshold(base)).toBe(0.5))
```

`tests/split/paid.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { getPercentagePaid, getTicketPaidPercentage, isItemPaid } from '@/lib/split'
import type { ItemAssignment } from '@/lib/types'

const item = { id: 'i1', quantity: 4, price: 8, discount_percentage: 0, discount_amount: 0 }
const a = (user_id: string, payment_type: 'unit' | 'percentage', amount: number): ItemAssignment =>
  ({ id: `${user_id}-${payment_type}-${amount}`, item_id: 'i1', user_id, payment_type, amount })

describe('getPercentagePaid', () => {
  it('sums unit assignments as amount/quantity', () =>
    expect(getPercentagePaid(item, [a('u1', 'unit', 2)])).toBe(0.5))
  it('sums percentage assignments directly', () =>
    expect(getPercentagePaid(item, [a('u1', 'percentage', 0.25)])).toBe(0.25))
  it('mixes unit and percentage', () =>
    expect(getPercentagePaid(item, [a('u1', 'unit', 1), a('u2', 'percentage', 0.5)])).toBe(0.75))
  it('filters by userId when given', () =>
    expect(getPercentagePaid(item, [a('u1', 'unit', 1), a('u2', 'unit', 2)], 'u2')).toBe(0.5))
})

describe('isItemPaid / getTicketPaidPercentage', () => {
  it('paid when fully covered', () =>
    expect(isItemPaid(item, [a('u1', 'unit', 4)])).toBe(true))
  it('not paid when partially covered', () =>
    expect(isItemPaid(item, [a('u1', 'unit', 3)])).toBe(false))
  it('ticket percentage across items', () => {
    const items = [
      { ...item, assignments: [a('u1', 'unit', 4)] },          // fully paid, 8
      { ...item, id: 'i2', assignments: [a('u1', 'unit', 2)] }, // half paid, 4 of 8
    ]
    expect(getTicketPaidPercentage(items)).toBe(0.75)
  })
})
```

`tests/split/max.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { calculateMaxPercentageAvailable, calculateMaxUnitsAvailable } from '@/lib/split'

const item = { id: 'i1', quantity: 4, price: 8, discount_percentage: 0, discount_amount: 0 }
const assignments = [
  { id: 'x', item_id: 'i1', user_id: 'u1', payment_type: 'unit' as const, amount: 1 },
]

it('max units available', () => expect(calculateMaxUnitsAvailable(item, assignments)).toBe(3))
it('max percentage available', () => expect(calculateMaxPercentageAvailable(item, assignments)).toBe(0.75))
```

`tests/split/bill.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { groupItemsByUser } from '@/lib/split'

const items = [
  {
    id: 'i1', quantity: 4, description: 'Beer', price: 8, discount_percentage: 0, discount_amount: 0, split_among: 0,
    assignments: [
      { id: 'a1', item_id: 'i1', user_id: 'u1', payment_type: 'unit' as const, amount: 3 },
      { id: 'a2', item_id: 'i1', user_id: 'u2', payment_type: 'unit' as const, amount: 1 },
    ],
  },
  {
    id: 'i2', quantity: 1, description: 'Pizza', price: 10, discount_percentage: 0, discount_amount: 0, split_among: 2,
    assignments: [
      { id: 'a3', item_id: 'i2', user_id: 'u1', payment_type: 'percentage' as const, amount: 0.5 },
      { id: 'a4', item_id: 'i2', user_id: 'u2', payment_type: 'percentage' as const, amount: 0.5 },
    ],
  },
]

it('groups amounts and units per user', () => {
  const bills = groupItemsByUser(items)
  const u1 = bills.find((b) => b.userId === 'u1')!
  const u2 = bills.find((b) => b.userId === 'u2')!
  expect(u1.items).toEqual([
    { description: 'Beer', amount: 6, unit: '3' },
    { description: 'Pizza', amount: 5, unit: '50%' },
  ])
  expect(u2.items).toEqual([
    { description: 'Beer', amount: 2, unit: '1' },
    { description: 'Pizza', amount: 5, unit: '50%' },
  ])
  expect(u1.total).toBe(11)
  expect(u2.total).toBe(7)
})
```

- [ ] **Step 2: Run, verify fail** — `npm test` → module not found.

- [ ] **Step 3: Implement**

`lib/split/price.ts`:
```ts
import type { TicketItem } from '@/lib/types'

type PricedItem = Pick<TicketItem, 'quantity' | 'price' | 'discount_percentage' | 'discount_amount'>

export const getFinalPrice = (item: PricedItem): number => {
  if (item.discount_amount > 0) return item.price - item.discount_amount
  if (item.discount_percentage > 0) return item.price - item.price * (item.discount_percentage / 100)
  return item.price
}

export const getUnitThreshold = (item: Pick<TicketItem, 'quantity'>): number => 1 / item.quantity
export const getUnitPrice = (item: PricedItem): number => item.price / item.quantity
```

`lib/split/paid.ts`:
```ts
import type { ItemAssignment, TicketItem } from '@/lib/types'
import { getFinalPrice, getUnitThreshold } from './price'

type Item = Pick<TicketItem, 'quantity' | 'price' | 'discount_percentage' | 'discount_amount'>

const sumBy = <T>(arr: T[], fn: (t: T) => number) => arr.reduce((acc, t) => acc + fn(t), 0)

export const getPercentagePaid = (item: Item, assignments: ItemAssignment[], userId?: string): number => {
  const threshold = getUnitThreshold(item)
  const toCount = userId === undefined ? assignments : assignments.filter((a) => a.user_id === userId)
  return sumBy(toCount, (a) => (a.payment_type === 'unit' ? a.amount * threshold : a.amount))
}

export const isItemPaid = (item: Item, assignments: ItemAssignment[]): boolean => {
  const finalPrice = getFinalPrice(item)
  return finalPrice === finalPrice * getPercentagePaid(item, assignments)
}

export const getTicketPaidPercentage = (
  items: Array<Item & { assignments: ItemAssignment[] }>,
): number => {
  const total = sumBy(items, (it) => getFinalPrice(it))
  if (total === 0) return 0
  const paid = sumBy(items, (it) => getFinalPrice(it) * getPercentagePaid(it, it.assignments))
  return paid / total
}
```

`lib/split/max.ts`:
```ts
import type { ItemAssignment, TicketItem } from '@/lib/types'
import { getPercentagePaid } from './paid'
import { getUnitThreshold } from './price'

type Item = Pick<TicketItem, 'quantity' | 'price' | 'discount_percentage' | 'discount_amount'>

export const calculateMaxUnitsAvailable = (item: Item, assignments: ItemAssignment[]): number =>
  item.quantity - getPercentagePaid(item, assignments) / getUnitThreshold(item)

export const calculateMaxPercentageAvailable = (item: Item, assignments: ItemAssignment[]): number =>
  1 - getPercentagePaid(item, assignments)
```

`lib/split/bill.ts`:
```ts
import type { ItemAssignment, TicketItem } from '@/lib/types'
import { numberToPercentage } from '@/lib/currency'
import { getFinalPrice } from './price'
import { getPercentagePaid } from './paid'

export type BillLine = { description: string; amount: number; unit: string }
export type UserBill = { userId: string; items: BillLine[]; total: number }

type Item = Pick<TicketItem, 'quantity' | 'description' | 'price' | 'discount_percentage' | 'discount_amount'> & {
  assignments: ItemAssignment[]
}

export const groupItemsByUser = (items: Item[]): UserBill[] => {
  const byUser = new Map<string, BillLine[]>()
  for (const item of items) {
    for (const a of item.assignments) {
      const line: BillLine = {
        description: item.description,
        amount: getFinalPrice(item) * getPercentagePaid(item, [a]),
        unit: a.payment_type === 'percentage' ? numberToPercentage(a.amount, '%').toString() : a.amount.toString(),
      }
      byUser.set(a.user_id, [...(byUser.get(a.user_id) ?? []), line])
    }
  }
  return [...byUser.entries()].map(([userId, lines]) => ({
    userId,
    items: lines,
    total: lines.reduce((acc, l) => acc + l.amount, 0),
  }))
}
```

`lib/split/index.ts`: `export * from './price'; export * from './paid'; export * from './max'; export * from './bill'`

- [ ] **Step 4: Run, verify pass** — `npm test` green.

- [ ] **Step 5: Commit** — `feat: split logic library ported from ticket-utils`

---

## Task 4: i18n (es/en/ca dictionaries + provider)

**Files:**
- Create: `lib/i18n/es.ts`, `lib/i18n/en.ts`, `lib/i18n/ca.ts`, `lib/i18n/index.tsx`

- [ ] **Step 1: Port dictionaries**

Source of truth: `/Users/fernando/development/workspace/personal/ticket-splitter/configuration/i18n/es.ts` (keys), `en.ts`, `ca.ts`. Copy each file's `translation` object verbatim into `lib/i18n/<lang>.ts` as `export const <lang>: Record<string, string> = { ... }` (strip the outer `{ translation: … }` wrapper). Then **delete** keys for dropped features: `'You need Premium'`, `'Successfully added premium'`, `'Validate Phone'`, `'Insert your phone number'`, `'Insert received code by WhatsApp'`, `'First must validate phone number'`, `'None of your contacts are in TapTicket. Share the ticket with them instead'`. **Add** these keys to all three dictionaries (translate appropriately):

```
'Add by email':      es 'Añadir por email'        en 'Add by email'        ca 'Afegeix per email'
'User email':        es 'Email del usuario'       en 'User email'          ca 'Email de l’usuari'
'User not found':    es 'Usuario no encontrado'   en 'User not found'      ca 'Usuari no trobat'
'Invalid link':      es 'Enlace no válido'        en 'Invalid link'        ca 'Enllaç no vàlid'
'Check your email':  es 'Revisa tu email'         en 'Check your email'    ca 'Revisa el teu email'
'Send code':         es 'Enviar código'           en 'Send code'           ca 'Envia el codi'
'Code':              es 'Código'                  en 'Code'                ca 'Codi'
'Continue with Google': es 'Continuar con Google' en 'Continue with Google' ca 'Continua amb Google'
'Sign in with email':   es 'Entrar con email'     en 'Sign in with email'  ca 'Entra amb email'
'Copy link':            es 'Copiar enlace'        en 'Copy link'           ca 'Copia l’enllaç'
'Link copied':          es 'Enlace copiado'       en 'Link copied'         ca 'Enllaç copiat'
'Scanning ticket':      es 'Escaneando ticket'    en 'Scanning ticket'     ca 'Escanejant tiquet'
'Remove':               es 'Eliminar'             en 'Remove'              ca 'Elimina'
```

- [ ] **Step 2: Write provider `lib/i18n/index.tsx`**

```tsx
'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { es } from './es'
import { en } from './en'
import { ca } from './ca'

export type Lang = 'es' | 'en' | 'ca'
const dicts: Record<Lang, Record<string, string>> = { es, en, ca }

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }>({
  lang: 'es',
  setLang: () => {},
  t: (k) => k,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es')
  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved && dicts[saved]) setLangState(saved)
  }, [])
  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }
  const t = (key: string) => dicts[lang][key] ?? dicts.en[key] ?? key
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
```

- [ ] **Step 3: Wire into `app/layout.tsx`** — wrap `{children}` in `<I18nProvider>` and add `<Toaster />` (sonner). Keep `lang="es"` on `<html>`.

- [ ] **Step 4: Commit** — `feat: i18n dictionaries and provider`

---

## Task 5: Supabase schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Write the full migration**

```sql
-- TapTicket initial schema
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  share_token text not null unique,
  restaurant jsonb not null default '{}',
  invoice jsonb not null default '{}',
  totals jsonb not null default '{}',
  img_path text not null,
  created_at timestamptz not null default now()
);

create table ticket_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  position int not null,
  quantity numeric not null,
  description text not null,
  price numeric not null,
  discount_percentage numeric not null default 0,
  discount_amount numeric not null default 0,
  split_among int not null default 0
);

create table item_assignments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references ticket_items(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  payment_type text not null check (payment_type in ('unit','percentage')),
  amount numeric not null default 0,
  unique (item_id, user_id)
);

create table ticket_members (
  ticket_id uuid not null references tickets(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  seen boolean not null default false,
  primary key (ticket_id, user_id)
);

create index ticket_items_ticket_idx on ticket_items(ticket_id);
create index item_assignments_item_idx on item_assignments(item_id);
create index item_assignments_user_idx on item_assignments(user_id);
create index ticket_members_user_idx on ticket_members(user_id);

-- profile auto-creation on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, display_name, photo_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- helper: is current user a member of a ticket
create or replace function is_ticket_member(p_ticket_id uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from ticket_members m where m.ticket_id = p_ticket_id and m.user_id = auth.uid())
$$;

-- helper: is current user the owner of a ticket (security definer: at owner-row insert
-- time the caller is not a member yet, so the tickets select policy would hide the row)
create or replace function is_ticket_owner(p_ticket_id uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from tickets t where t.id = p_ticket_id and t.owner_id = auth.uid())
$$;

-- join via share token (idempotent)
create or replace function join_ticket(p_ticket_id uuid, p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from ticket_members m where m.ticket_id = p_ticket_id and m.user_id = v_uid)
     and not exists (select 1 from tickets t where t.id = p_ticket_id and t.share_token = p_token) then
    raise exception 'invalid_token';
  end if;
  insert into ticket_members (ticket_id, user_id, role, seen)
  values (p_ticket_id, v_uid, 'member', false)
  on conflict (ticket_id, user_id) do nothing;
  insert into item_assignments (item_id, user_id, payment_type, amount)
  select i.id, v_uid, case when i.split_among > 0 then 'percentage' else 'unit' end, 0
  from ticket_items i
  where i.ticket_id = p_ticket_id
  on conflict (item_id, user_id) do nothing;
end $$;

-- add a registered user by email (caller must be a member)
create or replace function add_member_by_email(p_ticket_id uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
declare v_target uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from ticket_members m where m.ticket_id = p_ticket_id and m.user_id = v_uid) then
    raise exception 'not_a_member';
  end if;
  select id into v_target from profiles where lower(email) = lower(p_email);
  if v_target is null then raise exception 'user_not_found'; end if;
  insert into ticket_members (ticket_id, user_id, role, seen)
  values (p_ticket_id, v_target, 'member', false)
  on conflict (ticket_id, user_id) do nothing;
  insert into item_assignments (item_id, user_id, payment_type, amount)
  select i.id, v_target, case when i.split_among > 0 then 'percentage' else 'unit' end, 0
  from ticket_items i
  where i.ticket_id = p_ticket_id
  on conflict (item_id, user_id) do nothing;
end $$;

-- when a member is removed, drop their assignments on that ticket
create or replace function remove_member_assignments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from item_assignments a
  using ticket_items i
  where a.item_id = i.id and i.ticket_id = old.ticket_id and a.user_id = old.user_id;
  return old;
end $$;

create trigger on_member_removed
  after delete on ticket_members
  for each row execute function remove_member_assignments();

-- guard: members can update ticket content but not identity columns
create or replace function protect_ticket_columns() returns trigger
language plpgsql as $$
begin
  if new.id is distinct from old.id
     or new.owner_id is distinct from old.owner_id
     or new.share_token is distinct from old.share_token then
    raise exception 'protected_column';
  end if;
  return new;
end $$;

create trigger protect_ticket_columns
  before update on tickets
  for each row execute function protect_ticket_columns();

-- guard: members can flag seen but not change their role
create or replace function protect_member_role() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role then raise exception 'protected_column'; end if;
  return new;
end $$;

create trigger protect_member_role
  before update on ticket_members
  for each row execute function protect_member_role();

-- RLS
alter table profiles enable row level security;
alter table tickets enable row level security;
alter table ticket_items enable row level security;
alter table item_assignments enable row level security;
alter table ticket_members enable row level security;

create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles update own" on profiles for update to authenticated using (id = auth.uid());

create policy "tickets insert own" on tickets for insert to authenticated with check (owner_id = auth.uid());
create policy "tickets member read" on tickets for select to authenticated using (is_ticket_member(id));
create policy "tickets member update" on tickets for update to authenticated using (is_ticket_member(id));
create policy "tickets owner delete" on tickets for delete to authenticated using (owner_id = auth.uid());

create policy "items member read" on ticket_items for select to authenticated using (is_ticket_member(ticket_id));
create policy "items member insert" on ticket_items for insert to authenticated with check (is_ticket_member(ticket_id));
create policy "items member update" on ticket_items for update to authenticated using (is_ticket_member(ticket_id));
create policy "items member delete" on ticket_items for delete to authenticated using (is_ticket_member(ticket_id));

create policy "assignments member read" on item_assignments for select to authenticated
  using (exists (select 1 from ticket_items i where i.id = item_id and is_ticket_member(i.ticket_id)));
create policy "assignments member insert" on item_assignments for insert to authenticated
  with check (exists (select 1 from ticket_items i where i.id = item_id and is_ticket_member(i.ticket_id)));
create policy "assignments member update" on item_assignments for update to authenticated
  using (exists (select 1 from ticket_items i where i.id = item_id and is_ticket_member(i.ticket_id)));
create policy "assignments member delete" on item_assignments for delete to authenticated
  using (exists (select 1 from ticket_items i where i.id = item_id and is_ticket_member(i.ticket_id)));

create policy "members member read" on ticket_members for select to authenticated using (is_ticket_member(ticket_id));
create policy "members update own seen" on ticket_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members delete self or owner" on ticket_members for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from tickets t where t.id = ticket_id and t.owner_id = auth.uid()));
create policy "members owner insert" on ticket_members for insert to authenticated
  with check (user_id = auth.uid() and role = 'owner' and is_ticket_owner(ticket_id));
-- owner membership row is inserted by the ticket creator for their own tickets;
-- all other membership is created only via join_ticket / add_member_by_email

-- realtime
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table ticket_items;
alter publication supabase_realtime add table item_assignments;
alter publication supabase_realtime add table ticket_members;

-- storage bucket for receipt photos (private)
insert into storage.buckets (id, name, public) values ('ticket-images', 'ticket-images', false);

create policy "members read ticket images" on storage.objects for select to authenticated
  using (bucket_id = 'ticket-images' and is_ticket_member(name::uuid));
create policy "users upload ticket images" on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-images'
              and name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
create policy "owners delete ticket images" on storage.objects for delete to authenticated
  using (bucket_id = 'ticket-images' and is_ticket_member(name::uuid));
```

Note: `is_ticket_member` is `security definer` so policies on `ticket_members` don't recurse; `is_ticket_owner` is `security definer` because at owner-row insert time the caller is not yet a member, so the `tickets` select policy would hide the row from a plain `exists` subquery. `protect_ticket_columns` / `protect_member_role` triggers stop members from rewriting `owner_id`/`share_token`/their `role` via the member update policies.

- [ ] **Step 2: Commit** — `feat: supabase schema, RLS, RPCs`

(Applying it requires the user's Supabase project: `supabase link` + `supabase db push`, or paste into the SQL editor. Documented in Task 17's README.)

---

## Task 6: Supabase clients, middleware, auth

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `middleware.ts`, `app/auth/callback/route.ts`, `app/login/page.tsx`, `.env.local.example`

- [ ] **Step 1: Clients**

`lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
```

`lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
      },
    },
  })
}
```

`lib/supabase/middleware.ts` — standard `@supabase/ssr` `updateSession` pattern plus guard:
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p))
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    const next = path + request.nextUrl.search
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(next)}`
    return NextResponse.redirect(url)
  }
  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/tickets'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return response
}
```

`middleware.ts`:
```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 2: OAuth callback `app/auth/callback/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/tickets'
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
```

- [ ] **Step 3: Login page `app/login/page.tsx`** (client component)

Behavior:
- `useSearchParams()` reads `next` (default `/tickets`).
- "Continue with Google" → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ${origin}/auth/callback?next=${encodeURIComponent(next)} } })`.
- Email section: input + "Send code" → `signInWithOtp({ email, options: { shouldCreateUser: true } })`, show code input; "Validate" → `verifyOtp({ email, token, type: 'email' })` → `router.push(next)` + `router.refresh()`.
- Show `t('Check your email')` after sending. Errors via `toast.error`.
- Branding: app name "TapTicket" + tagline 'EASY SHARING', centered card.

- [ ] **Step 4: `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key — server only, account deletion>
AI_PROVIDER=groq
GROQ_API_KEY=<groq key — server only>
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
MOCK_SCAN=false
```

- [ ] **Step 5: `app/page.tsx`** — `import { redirect } from 'next/navigation'; export default function Home() { redirect('/tickets') }`.

- [ ] **Step 6: Commit** — `feat: supabase clients, auth middleware, login`

---

## Task 7: AI layer (TDD parser + Groq provider)

**Files:**
- Create: `lib/ai/types.ts`, `lib/ai/parser.ts`, `lib/ai/groq.ts`, `lib/ai/mock.ts`, `lib/ai/index.ts`
- Test: `tests/ai/parser.test.ts`

- [ ] **Step 1: `lib/ai/types.ts`**

```ts
import type { InferredTicket } from '@/lib/types'

export type ScanInput = { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }
export interface TicketScanner {
  scan(input: ScanInput): Promise<InferredTicket>
}

export const SCAN_PROMPT = `
    Transform this restaurant ticket image into a JSON object and only return the resulting JSON surrounded by the mark "\`\`\`json" for the beginning of the JSON and "\`\`\`" for the end of the JSON.
    Don't change dates format and read them as follow if date starts with 4 digits, then the format is YYYY/MM/DD, if starts with 2 digits then is DD/MM/YYYY and if starts with 1 digit then is D/M/YY.
    The discount_percentage and discount_field fields are optional because not all the items have discount, so set those fields to null if you can't find the discount.
`

// ported from RN services/types.ts responseSchema
export const RESPONSE_SCHEMA = { type: 'object', properties: { restaurant: { type: 'object', properties: { name: { type: 'string' }, address: { type: 'string' }, phone: { type: 'string' }, NIF: { type: 'string' } }, required: ['name'], additionalProperties: false }, invoice: { type: 'object', properties: { type: { type: 'string' }, operation_number: { type: 'string' }, table: { type: 'string' }, date: { type: 'string', format: 'date-time' }, cashier: { type: 'string' } }, required: [], additionalProperties: false }, items: { type: 'array', items: { type: 'object', properties: { quantity: { type: 'integer' }, description: { type: 'string' }, unitPrice: { type: 'number' }, price: { type: 'number' }, discount_percentage: { type: 'number' }, discount_amount: { type: 'number' } }, required: ['quantity', 'description', 'price'], additionalProperties: false } }, totals: { type: 'object', properties: { base: { type: 'number' }, tax: { type: 'object', properties: { percentage: { type: 'number' }, amount: { type: 'number' } } }, total_without_tax: { type: 'number' }, total_with_tax: { type: 'number' } }, required: [], additionalProperties: false } }, required: ['restaurant', 'invoice', 'items', 'totals'] } as const
```

- [ ] **Step 2: Failing test `tests/ai/parser.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { parseScanResponse } from '@/lib/ai/parser'

const ticketJson = `{"restaurant":{"name":"Bar X","address":"C/ Y 1","phone":"93","NIF":"B1"},"invoice":{"type":"SIMPLIFICADA","operation_number":"1","table":"3","date":"04/12/2024","cashier":"Ana"},"items":[{"quantity":2,"description":"Caña","unitPrice":2.5,"price":5,"discount_percentage":null,"discount_amount":null}],"totals":{"base":4.55,"tax":{"percentage":10,"amount":0.45},"total_without_tax":4.55,"total_with_tax":5}}`

it('extracts fenced json', () => {
  const t = parseScanResponse(`Here you go:\n\`\`\`json\n${ticketJson}\n\`\`\`\nDone`)
  expect(t.restaurant.name).toBe('Bar X')
  expect(t.items[0].discount_amount).toBeNull()
})

it('parses unfenced json', () => {
  const t = parseScanResponse(ticketJson)
  expect(t.totals.total_with_tax).toBe(5)
})

it('sanitizes european decimals', () => {
  const european = ticketJson.replace('"price":5,', '"price":5,00,')
  const t = parseScanResponse(`\`\`\`json\n${european}\n\`\`\``)
  expect(t.items[0].price).toBe(5.0)
})

it('throws on garbage', () => expect(() => parseScanResponse('not json at all')).toThrow())
```

- [ ] **Step 3: Run, verify fail.**

- [ ] **Step 4: Implement `lib/ai/parser.ts`** (exact port of RN `convertResponse`/`sanitizeString`)

```ts
import type { InferredTicket } from '@/lib/types'

function sanitizeString(input: string): string {
  return input.replace(/\b\d+,\d+\b/g, (m) => m.replace(',', '.'))
}

export function parseScanResponse(raw: string): InferredTicket {
  const sanitized = sanitizeString(raw)
  const match = sanitized.match(/```json\s*({[\s\S]*?})\s*```/)
  const jsonString = match ? match[1] : sanitized
  try {
    return JSON.parse(jsonString) as InferredTicket
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error}`)
  }
}
```

- [ ] **Step 5: Implement `lib/ai/groq.ts`** (fetch-based, no SDK — one less dependency)

```ts
import type { InferredTicket } from '@/lib/types'
import { parseScanResponse } from './parser'
import { RESPONSE_SCHEMA, SCAN_PROMPT, type ScanInput, type TicketScanner } from './types'

const MODEL = process.env.GROQ_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct'

export class GroqScanner implements TicketScanner {
  async scan(input: ScanInput): Promise<InferredTicket> {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        top_p: 0.7,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `${SCAN_PROMPT} Follow this json schema: ${JSON.stringify(RESPONSE_SCHEMA)}.` },
              { type: 'image_url', image_url: { url: `data:${input.mediaType};base64,${input.base64}` } },
            ],
          },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const raw: string = data.choices?.[0]?.message?.content ?? ''
    return parseScanResponse(raw)
  }
}
```

- [ ] **Step 6: `lib/ai/mock.ts`** — returns a realistic Spanish sample ticket (used when `MOCK_SCAN=true`):

```ts
import type { InferredTicket } from '@/lib/types'
import type { ScanInput, TicketScanner } from './types'

export class MockScanner implements TicketScanner {
  async scan(_input: ScanInput): Promise<InferredTicket> {
    return {
      restaurant: { name: 'PICARDIA CAFE S.L.', address: 'C/ Mallorca 123, Barcelona', phone: '931234567', NIF: 'B-12345678' },
      invoice: { type: 'FACTURA SIMPLIFICADA', operation_number: '1DD4F067-115', table: '12', date: '04/12/2024', cashier: '' },
      items: [
        { quantity: 2, description: 'Tapa Aperitivo', unitPrice: 3.0, price: 6.0, discount_percentage: null, discount_amount: null },
        { quantity: 2, description: 'Vermut de la casa', unitPrice: 3.5, price: 7.0, discount_percentage: null, discount_amount: null },
        { quantity: 1, description: 'Parmigiano Fries', unitPrice: 4.4, price: 4.4, discount_percentage: null, discount_amount: null },
        { quantity: 1, description: 'Caña', unitPrice: 1.5, price: 1.5, discount_percentage: null, discount_amount: null },
      ],
      totals: { base: 17.18, tax: { percentage: 10, amount: 1.72 }, total_without_tax: 17.18, total_with_tax: 18.9 },
    }
  }
}
```

- [ ] **Step 7: `lib/ai/index.ts`**

```ts
import { GroqScanner } from './groq'
import { MockScanner } from './mock'
import type { TicketScanner } from './types'

export function getScanner(): TicketScanner {
  if (process.env.MOCK_SCAN === 'true') return new MockScanner()
  const provider = process.env.AI_PROVIDER ?? 'groq'
  switch (provider) {
    case 'groq':
      return new GroqScanner()
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`)
  }
}
```

- [ ] **Step 8: Run, verify pass; Commit** — `feat: AI scanner abstraction with Groq provider`

---

## Task 8: Scan API route

**Files:**
- Create: `app/api/scan/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getScanner } from '@/lib/ai'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 10 * 1024 * 1024
const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function shareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return [...bytes].map((b) => TOKEN_ALPHABET[b % 62]).join('')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('image')
  if (!(file instanceof File)) return NextResponse.json({ error: 'missing image' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'unsupported type' }, { status: 415 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'image too large' }, { status: 413 })

  const buffer = Buffer.from(await file.arrayBuffer())

  // 1) create the ticket row first (id needed for storage path), with placeholder content.
  //    NOTE: generate the id in the route and insert WITHOUT .select() — the tickets SELECT
  //    policy requires membership, which doesn't exist yet, so INSERT...RETURNING would fail RLS.
  const ticketId = crypto.randomUUID()
  const { error: ticketError } = await supabase
    .from('tickets')
    .insert({ id: ticketId, owner_id: user.id, share_token: shareToken(), img_path: '', restaurant: {}, invoice: {}, totals: {} })
  if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 500 })

  // 1.5) owner membership MUST come before any ticket update / items insert (RLS requires membership)
  const { error: memberError } = await supabase
    .from('ticket_members')
    .insert({ ticket_id: ticketId, user_id: user.id, role: 'owner', seen: false })
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  // 2) upload the image
  const imgPath = ticketId
  const { error: uploadError } = await supabase.storage
    .from('ticket-images')
    .upload(imgPath, buffer, { contentType: file.type })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // 3) AI scan
  let inferred
  try {
    inferred = await getScanner().scan({ base64: buffer.toString('base64'), mediaType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' })
  } catch (e) {
    return NextResponse.json({ error: `scan failed: ${e}` }, { status: 502 })
  }

  // 4) fill the ticket, items + default owner assignment (owner membership already inserted at 1.5)
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ restaurant: inferred.restaurant, invoice: inferred.invoice, totals: inferred.totals, img_path: imgPath })
    .eq('id', ticketId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { data: items, error: itemsError } = await supabase
    .from('ticket_items')
    .insert(
      inferred.items.map((it, i) => ({
        ticket_id: ticketId,
        position: i,
        quantity: it.quantity,
        description: it.description,
        price: it.price,
        discount_percentage: it.discount_percentage ?? 0,
        discount_amount: it.discount_amount ?? 0,
      })),
    )
    .select('id')
  if (itemsError || !items) return NextResponse.json({ error: itemsError?.message ?? 'items failed' }, { status: 500 })

  await supabase.from('item_assignments').insert(items.map((it) => ({ item_id: it.id, user_id: user.id, payment_type: 'unit', amount: 0 })))

  return NextResponse.json({ ticketId })
}
```

Note: RLS order matters and is encoded above: ticket row (id generated route-side, no RETURNING — the SELECT policy requires membership that doesn't exist yet) → owner `ticket_members` row (allowed by the `members owner insert` policy via `is_ticket_owner`) → image upload → AI → ticket update (member update policy) → items (member insert policy; `.select('id')` is fine now that membership exists) → assignments.

- [ ] **Step 2: Commit** — `feat: scan api route`

---

## Task 9: Data queries + realtime hooks

**Files:**
- Create: `lib/queries.ts`, `lib/hooks/useTicket.ts`, `lib/hooks/useTicketList.ts`

- [ ] **Step 1: `lib/queries.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TicketDetail, TicketItemWithAssignments, MemberWithProfile } from '@/lib/types'

export async function fetchTicketDetail(supabase: SupabaseClient, ticketId: string): Promise<TicketDetail> {
  const { data: ticket, error } = await supabase.from('tickets').select('*').eq('id', ticketId).single()
  if (error) throw error
  const { data: items } = await supabase.from('ticket_items').select('*').eq('ticket_id', ticketId).order('position')
  const itemIds = (items ?? []).map((i) => i.id)
  const { data: assignments } = itemIds.length
    ? await supabase.from('item_assignments').select('*').in('item_id', itemIds)
    : { data: [] }
  const { data: members } = await supabase.from('ticket_members').select('*').eq('ticket_id', ticketId)
  const userIds = (members ?? []).map((m) => m.user_id)
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('*').in('id', userIds)
    : { data: [] }
  return {
    ...ticket,
    items: (items ?? []).map((i): TicketItemWithAssignments => ({
      ...i,
      assignments: (assignments ?? []).filter((a) => a.item_id === i.id),
    })),
    members: (members ?? []).map((m): MemberWithProfile => ({
      ...m,
      profile: (profiles ?? []).find((p) => p.id === m.user_id) ?? { id: m.user_id, email: '', display_name: null, photo_url: null },
    })),
  }
}

export async function fetchTicketList(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: memberships, error } = await supabase
    .from('ticket_members')
    .select('ticket_id, seen, role, tickets(*)')
    .eq('user_id', user.id)
    .order('seen', { ascending: true })
  if (error) throw error
  const rows = (memberships ?? []).filter((m) => m.tickets)
  const ticketIds = rows.map((m) => m.ticket_id)
  const { data: items } = ticketIds.length
    ? await supabase.from('ticket_items').select('*, item_assignments(*)').in('ticket_id', ticketIds)
    : { data: [] }
  return rows.map((m) => ({
    membership: { ticket_id: m.ticket_id, seen: m.seen, role: m.role },
    ticket: m.tickets,
    items: (items ?? []).filter((i) => i.ticket_id === m.ticket_id),
  }))
}
```

- [ ] **Step 2: `lib/hooks/useTicket.ts`** (client)

```ts
'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchTicketDetail } from '@/lib/queries'
import type { TicketDetail } from '@/lib/types'

export function useTicket(ticketId: string) {
  const [supabase] = useState(createClient)
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setTicket(await fetchTicketDetail(supabase, ticketId))
    } finally {
      setLoading(false)
    }
  }, [supabase, ticketId])

  useEffect(() => {
    reload()
    const channel = supabase
      .channel(`ticket:${ticketId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_items', filter: `ticket_id=eq.${ticketId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_assignments' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_members', filter: `ticket_id=eq.${ticketId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` }, reload)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [reload, supabase, ticketId])

  return { ticket, loading, reload }
}
```

- [ ] **Step 3: `lib/hooks/useTicketList.ts`** — same pattern around `fetchTicketList`; subscribes to `ticket_members` (all events → reload).

- [ ] **Step 4: Commit** — `feat: ticket queries and realtime hooks`

---

## Task 10: Mutations

**Files:**
- Create: `lib/mutations.ts`

- [ ] **Step 1: Implement**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Invoice, PaymentType, Restaurant, TicketItemWithAssignments, Totals } from '@/lib/types'

// upsert one user's share of one item
export async function setItemAmount(
  supabase: SupabaseClient,
  itemId: string,
  userId: string,
  paymentType: PaymentType,
  amount: number,
) {
  const { error } = await supabase
    .from('item_assignments')
    .upsert({ item_id: itemId, user_id: userId, payment_type: paymentType, amount }, { onConflict: 'item_id,user_id' })
  if (error) throw error
}

// split item evenly among N; selected user takes 1/N, rest 0 (RN handleSplitItem)
export async function splitItem(supabase: SupabaseClient, item: TicketItemWithAssignments, n: number, userId: string) {
  const { error } = await supabase.from('ticket_items').update({ split_among: n }).eq('id', item.id)
  if (error) throw error
  const { error: aErr } = await supabase.from('item_assignments').upsert(
    item.assignments.map((a) => ({
      item_id: item.id,
      user_id: a.user_id,
      payment_type: 'percentage' as const,
      amount: a.user_id === userId ? 1 / n : 0,
    })),
    { onConflict: 'item_id,user_id' },
  )
  if (aErr) throw aErr
}

export async function unsplitItem(supabase: SupabaseClient, item: TicketItemWithAssignments) {
  const { error } = await supabase.from('ticket_items').update({ split_among: 0 }).eq('id', item.id)
  if (error) throw error
  const { error: aErr } = await supabase.from('item_assignments').upsert(
    item.assignments.map((a) => ({ item_id: item.id, user_id: a.user_id, payment_type: 'unit' as const, amount: 0 })),
    { onConflict: 'item_id,user_id' },
  )
  if (aErr) throw aErr
}

export async function updateTicketFields(
  supabase: SupabaseClient,
  ticketId: string,
  fields: { restaurant?: Restaurant; invoice?: Invoice; totals?: Totals },
) {
  const { error } = await supabase.from('tickets').update(fields).eq('id', ticketId)
  if (error) throw error
}

export async function updateItemFields(
  supabase: SupabaseClient,
  itemId: string,
  fields: Partial<Pick<TicketItemWithAssignments, 'quantity' | 'description' | 'price' | 'discount_percentage' | 'discount_amount'>>,
) {
  const { error } = await supabase.from('ticket_items').update(fields).eq('id', itemId)
  if (error) throw error
}

export async function deleteTicket(supabase: SupabaseClient, ticketId: string, imgPath: string) {
  const { error } = await supabase.from('tickets').delete().eq('id', ticketId)
  if (error) throw error
  await supabase.storage.from('ticket-images').remove([imgPath])
}

export async function removeMember(supabase: SupabaseClient, ticketId: string, userId: string) {
  const { error } = await supabase.from('ticket_members').delete().eq('ticket_id', ticketId).eq('user_id', userId)
  if (error) throw error
}

export async function markSeen(supabase: SupabaseClient, ticketId: string, userId: string) {
  await supabase.from('ticket_members').update({ seen: true }).eq('ticket_id', ticketId).eq('user_id', userId)
}

export async function joinTicket(supabase: SupabaseClient, ticketId: string, token: string) {
  const { error } = await supabase.rpc('join_ticket', { p_ticket_id: ticketId, p_token: token })
  if (error) throw error
}

export async function addMemberByEmail(supabase: SupabaseClient, ticketId: string, email: string) {
  const { error } = await supabase.rpc('add_member_by_email', { p_ticket_id: ticketId, p_email: email })
  if (error) throw error
}
```

- [ ] **Step 2: Commit** — `feat: ticket mutations`

---

## Task 11: Ticket list page + shared chrome

**Files:**
- Create: `components/bottom-nav.tsx`, `components/app-header.tsx`, `app/tickets/page.tsx`

- [ ] **Step 1: `components/bottom-nav.tsx`** — fixed bottom bar, 3 tabs using `lucide-react` icons: `ReceiptText` → `/tickets` (`t('My tickets')`), `Camera` → `/scan` (`t('Import')`), `User` → `/account` (`t('My account')`). Highlight active via `usePathname()`.

- [ ] **Step 2: `app/tickets/page.tsx`** (client component)

Behavior:
- `useTicketList()`; group tickets by month of `created_at` desc (use `Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' })`).
- Each row (`components` inline ok): restaurant name, date, total `numberToCurrency(totals.total_with_tax, lang) + ' €'`, current-user paid sum (compute via `getPercentagePaid` per item for current user × `getFinalPrice`), red dot when `!membership.seen`.
- Tap → `markSeen` then `router.push(/tickets/${id})`.
- Empty state: `t('No tickets yet')`.
- Render `<BottomNav />`.

- [ ] **Step 3: Commit** — `feat: ticket list page and bottom nav`

---

## Task 12: Ticket summary page (main screen)

**Files:**
- Create: `app/tickets/[id]/page.tsx`, `components/ticket-items.tsx`, `components/item-dialog.tsx`, `components/users-carousel.tsx`, `components/individual-bill.tsx`, `components/tag-dialog.tsx`, `components/share-button.tsx`

- [ ] **Step 1: `components/users-carousel.tsx`** — horizontal scroll of member avatars (`photo_url` or initials fallback). Props: `members: MemberWithProfile[]`, `selected: string`, `onSelect(userId)`. Selected avatar gets a ring. Show `display_name ?? email` under avatar.

- [ ] **Step 2: `components/ticket-items.tsx`** — read-only item rows: description, `quantity × price €` formatted; when `isItemPaid(item, item.assignments)` show line-through + green check icon; rows showing the **selected user's** assigned amount on the right (`getFinalPrice(item) * getPercentagePaid(item, assignments, selectedUserId)` when > 0). `onPress(item)` opens the dialog.

- [ ] **Step 3: `components/item-dialog.tsx`** — the exact port of RN `ItemPressDialogContent`:

Props: `item: TicketItemWithAssignments`, `userId` (current user), `onClose`.
Local state: `view: 'mine' | 'split'`, `amount` initialized from the current user's assignment (display value: if `split_among > 0` → `amount * split_among` parts, else units).

- Toggle "My part" / "Split" (shadcn tabs or two buttons): labels `t('Units')` / `t('Percentage')`.
- **My part:** numeric stepper (− / value / +). Label: if split → `t('My share')` with max = `(calculateMaxPercentageAvailable(item, othersAssignments) + ownAmount) * split_among` displayed as parts of `split_among`; else `t('Units')` with max = `calculateMaxUnitsAvailable(item, othersAssignments) + ownUnits`. "others" = assignments excluding current user. Save → `setItemAmount(supabase, item.id, userId, split_among > 0 ? 'percentage' : 'unit', split_among > 0 ? value / split_among : value)`.
- **Split:** stepper N ≥ 2 → `splitItem(supabase, item, n, userId)`. If `item.split_among > 0`: show `t('This item has been split in') + N + t('Parts')` and an "Unsplit" button → `unsplitItem`.
- After each mutation, parent refetches via realtime (no manual reload needed).

- [ ] **Step 4: `components/individual-bill.tsx`** — props `bill: UserBill`; header `t('Your bill')`, lines with description / unit / amount, footer total `t('Total')` + `numberToCurrency(bill.total, lang) €`.

- [ ] **Step 5: `components/share-button.tsx`** — builds `${window.location.origin}/join?ticketId=${ticket.id}&token=${ticket.share_token}`; uses `navigator.share({ url, title })` when available, else clipboard copy + `toast.success(t('Link copied'))`. Label `t('Share')`.

- [ ] **Step 6: `components/tag-dialog.tsx`** — email input + confirm → `addMemberByEmail`; on error containing `user_not_found` → `toast.error(t('User not found'))`; success → `toast.success(t('Success'))`. Also list current members with a remove (trash) icon → `removeMember` (confirm with `t('Are you sure?')`). Label `t('Tag')`.

- [ ] **Step 7: `app/tickets/[id]/page.tsx`** (client component)

- `const { id } = use(params)` (Next 15 async params) or `'use client'` + `useParams()`.
- `useTicket(id)`; on load, if current user's membership `!seen` → `markSeen`.
- Header: receipt image — get signed URL: `supabase.storage.from('ticket-images').createSignedUrl(ticket.img_path, 3600)` in an effect; tap → fullscreen dialog.
- Below: restaurant name, invoice date, totals.
- `<UsersCarousel>` default selected = current user.
- `<TicketItems>` + tap → `<ItemDialog>`.
- `<IndividualBill>` for selected user (`groupItemsByUser(ticket.items)` find selected).
- Ticket paid percentage progress bar: `getTicketPaidPercentage(ticket.items)` × 100 with `t('Total to pay')` / `t('Remaining')` amounts.
- Buttons: `<ShareButton>`, `<TagDialog>`, Edit → `/tickets/[id]/edit`.
- `<BottomNav />`.

- [ ] **Step 8: Commit** — `feat: ticket summary screen with assign/split dialog`

---

## Task 13: Edit page

**Files:**
- Create: `app/tickets/[id]/edit/page.tsx`

- [ ] **Step 1: Implement** — form with sections: Restaurant (name, address, phone, NIF), Invoice (type, operation_number, table, date, cashier), Items (each: description, quantity, price, discount_percentage, discount_amount — editable inputs bound to local state), Totals (base, tax.percentage, tax.amount, total_without_tax, total_with_tax). Save → `updateTicketFields` + per-item `updateItemFields`, then `router.back()`. Delete button → confirm dialog (`t('Are you sure?')`) → `deleteTicket` → `/tickets`. Labels from i18n dict (`t('Restaurant')`, `t('Description')`, `t('Save')`, `t('Delete')`, …).

- [ ] **Step 2: Commit** — `feat: ticket edit page`

---

## Task 14: Scan page

**Files:**
- Create: `app/scan/page.tsx`

- [ ] **Step 1: Implement** (client component)

- Hidden `<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment">`; big camera button triggers it (label `t('Take picture')`).
- On select: preview dialog with the image (`URL.createObjectURL`), buttons `t('Translate')` (primary) and `t('Take another picture')`.
- Confirm → progress state (`t('Scanning ticket')` + spinner) → `POST /api/scan` with FormData `{ image: file }`.
- Success `{ ticketId }` → `toast.success(t('Successfully added'))` → `router.replace(/tickets/${ticketId})`.
- Error → `toast.error(t('Error translating ticket'))`, reset to capture state.
- `<BottomNav />`.

- [ ] **Step 2: Commit** — `feat: scan page`

---

## Task 15: Join page + account page

**Files:**
- Create: `app/join/page.tsx`, `app/account/page.tsx`, `app/api/account/route.ts`, `components/language-picker.tsx`

- [ ] **Step 1: `app/join/page.tsx`** (client, wrapped in `<Suspense>` for `useSearchParams`)

- Read `ticketId`, `token`. Missing → error message `t('Invalid link')`.
- Effect: `joinTicket(supabase, ticketId, token)` → success: `router.replace(/tickets/${ticketId})`; on `invalid_token` error → show `t('Invalid link')`.
- Unauthenticated users never reach here: middleware bounces to `/login?next=/join?ticketId=…&token=…`, and login/callback return them.

- [ ] **Step 2: `components/language-picker.tsx`** — select with es/en/ca labels (`t('es')`, `t('en')`, `t('ca')`), uses `useI18n().setLang`.

- [ ] **Step 3: `app/account/page.tsx`** — avatar + display name + email; editable display name → update `profiles`; `<LanguagePicker />`; sign out → `supabase.auth.signOut()` → `/login`; delete account → confirm dialog with the warning string → `DELETE /api/account` → sign out → `/login`.

- [ ] **Step 4: `app/api/account/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

(Cascades: `profiles` ← auth.users cascade; `ticket_members`, `item_assignments`, owned `tickets` ← profiles cascade.)

- [ ] **Step 5: Commit** — `feat: join and account pages`

---

## Task 16: PWA

**Files:**
- Modify: `next.config.ts`, `app/layout.tsx`
- Create: `app/manifest.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png`

- [ ] **Step 1: Icons** — reuse the RN app icon:

```bash
mkdir -p public/icons
sips -Z 512 /Users/fernando/development/workspace/personal/ticket-splitter/assets/images/icon.png --out public/icons/icon-512.png
sips -Z 192 /Users/fernando/development/workspace/personal/ticket-splitter/assets/images/icon.png --out public/icons/icon-192.png
```

- [ ] **Step 2: `app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TapTicket',
    short_name: 'TapTicket',
    description: 'Scan a ticket and split it easily',
    start_url: '/tickets',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

- [ ] **Step 3: next-pwa**

```bash
npm i @ducanh2912/next-pwa
```

`next.config.ts`:
```ts
import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({ dest: 'public', disable: process.env.NODE_ENV === 'development' })

const nextConfig: NextConfig = { output: 'standalone' }

export default withPWA(nextConfig)
```

- [ ] **Step 4: Verify** — `npm run build` passes; `/manifest.webmanifest` served.

- [ ] **Step 5: Commit** — `feat: pwa support`

---

## Task 17: Docker + fly.io + README

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `fly.toml`, `README.md`

- [ ] **Step 1: `Dockerfile`**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

`.dockerignore`: `node_modules`, `.next`, `.git`, `docs`, `supabase`, `.env*`.

- [ ] **Step 2: `fly.toml`**

```toml
app = "tapticket"
primary_region = "mad"

[build]
  dockerfile = "Dockerfile"

[build.args]
  NEXT_PUBLIC_SUPABASE_URL = "https://<project>.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY = "<anon key>"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

(Note in README: `NEXT_PUBLIC_*` must be build args because Next inlines them at build time. Server secrets via `fly secrets set GROQ_API_KEY=… SUPABASE_SERVICE_ROLE_KEY=…`.)

- [ ] **Step 3: `README.md`** — setup: Supabase project → run `supabase/migrations/0001_init.sql` in SQL editor → enable Google provider + email OTP in Auth settings → copy `.env.local.example` to `.env.local` → `npm run dev`. Deploy: `fly launch --no-deploy` / `fly deploy`. `MOCK_SCAN=true` for dev without a Groq key.

- [ ] **Step 4: Verify Docker build** — `docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder -t tapticket .` succeeds.

- [ ] **Step 5: Commit** — `feat: docker and fly.io deployment`

---

## Task 18: Final verification

- [ ] **Step 1:** `npm test` — all green.
- [ ] **Step 2:** `npm run build` — clean (no type errors, no lint errors).
- [ ] **Step 3:** `docker build` — green (Task 17 Step 4).
- [ ] **Step 4:** Manual smoke checklist (documented for the user; requires their Supabase project): sign up with email OTP → scan with `MOCK_SCAN=true` → assign units → split an item → share link → second account joins via link → tag by email → realtime update visible in both sessions.
- [ ] **Step 5: Commit** — `chore: final verification`

---

## Self-review notes

- Spec coverage: every spec section maps to ≥1 task (schema→T5, auth→T6, AI→T7/T8, split→T3/T12, pages→T11–T15, PWA→T16, deploy→T17, testing→T2/T3/T7/T18).
- Known deviation from spec resolved in T8: insert owner membership before items (RLS requires it).
- Realtime on `item_assignments` is intentionally unfiltered (equality filters can't reach the parent ticket id); reload-on-any-event is correct and cheap at this scale.
