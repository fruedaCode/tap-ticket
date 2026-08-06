-- TapTicket settle-up flow: each member pays their own share and records it with a
-- mandatory proof photo; any other member confirms or rejects the claim.

create table settlements (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  from_user uuid not null references profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  proof_path text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index settlements_ticket_idx on settlements(ticket_id);

-- guard: only a pending settlement may be resolved; everything else is immutable
create or replace function protect_settlement_columns() returns trigger
language plpgsql as $$
begin
  if new.id is distinct from old.id
     or new.ticket_id is distinct from old.ticket_id
     or new.from_user is distinct from old.from_user
     or new.amount is distinct from old.amount
     or new.proof_path is distinct from old.proof_path
     or old.status <> 'pending'
     or new.status = 'pending' then
    raise exception 'protected_column';
  end if;
  new.resolved_at := now();
  return new;
end $$;

create trigger protect_settlement_columns
  before update on settlements
  for each row execute function protect_settlement_columns();

-- RLS
alter table settlements enable row level security;

create policy "settlements member read" on settlements for select to authenticated
  using (is_ticket_member(ticket_id));
create policy "settlements insert own" on settlements for insert to authenticated
  with check (from_user = auth.uid() and is_ticket_member(ticket_id));
-- any member other than the payer may confirm or reject
create policy "settlements members resolve" on settlements for update to authenticated
  using (from_user <> auth.uid() and is_ticket_member(ticket_id))
  with check (from_user <> auth.uid() and is_ticket_member(ticket_id));

-- realtime (the existing ticket-topic realtime.messages policy already gates membership)
alter publication supabase_realtime add table settlements;

-- storage bucket for payment proof photos (private); object names are
-- '<ticket uuid>/<settlement uuid>.<ext>' so policies can key on ticket membership
insert into storage.buckets (id, name, public) values ('settlement-proofs', 'settlement-proofs', false);

create policy "members read settlement proofs" on storage.objects for select to authenticated
  using (
    bucket_id = 'settlement-proofs'
    and case
      when name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.[a-zA-Z0-9]+$'
      then is_ticket_member((storage.foldername(name))[1]::uuid)
      else false
    end
  );
create policy "members upload settlement proofs" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'settlement-proofs'
    and case
      when name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.[a-zA-Z0-9]+$'
      then is_ticket_member((storage.foldername(name))[1]::uuid)
      else false
    end
  );
-- owner-only so ticket deletion can clean up proofs; members cannot delete each other's proofs
create policy "owners delete settlement proofs" on storage.objects for delete to authenticated
  using (
    bucket_id = 'settlement-proofs'
    and case
      when name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.[a-zA-Z0-9]+$'
      then is_ticket_owner((storage.foldername(name))[1]::uuid)
      else false
    end
  );
