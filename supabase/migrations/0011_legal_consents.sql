-- Legal consent records — currently the art. 102 TRLGDCU withdrawal waiver
-- accepted via the explicit checkout checkbox before subscribing (see
-- lib/legal/withdrawal.ts and /api/billing/checkout).
--
-- Each row is evidence: who consented, the exact versioned text they saw, and
-- when (plus client hints). Art. 101 TRLGDCU puts the burden of proof on the
-- business, so these rows must never be user-editable: inserts happen only
-- from the server with the service role; RLS lets users read their own rows.
-- Rows go away with the account (on delete cascade), matching the account
-- deletion promise in the privacy policy.
--
-- Additive only: new table.

create table legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null,
  document_version text not null,
  consent_text text not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index legal_consents_user_id_idx on legal_consents (user_id);

alter table legal_consents enable row level security;

create policy "legal_consents select own" on legal_consents for select to authenticated
  using (user_id = auth.uid());
