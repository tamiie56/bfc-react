-- BFC team panel - Supabase setup.
-- Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
-- Safe to run more than once.

-- ---------- tables ----------
create table if not exists public.orders (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.bookings (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

-- small shared settings: menu edits ("menu") and delivery charge ("settings")
create table if not exists public.kv (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.orders   enable row level security;
alter table public.bookings enable row level security;
alter table public.kv       enable row level security;

-- ---------- access rules ----------
-- Customers (not signed in = "anon") may ONLY place a new order / booking.
-- They can never read, change or delete anything.
-- Signed-in team members ("authenticated") can read, update and delete.

drop policy if exists "customers place orders" on public.orders;
create policy "customers place orders" on public.orders
  for insert to anon, authenticated
  with check ((data->>'status') = 'new');

drop policy if exists "team reads orders" on public.orders;
create policy "team reads orders" on public.orders
  for select to authenticated using (true);

drop policy if exists "team updates orders" on public.orders;
create policy "team updates orders" on public.orders
  for update to authenticated using (true) with check (true);

drop policy if exists "team deletes orders" on public.orders;
create policy "team deletes orders" on public.orders
  for delete to authenticated using (true);

drop policy if exists "customers place bookings" on public.bookings;
create policy "customers place bookings" on public.bookings
  for insert to anon, authenticated
  with check ((data->>'status') = 'pending');

drop policy if exists "team reads bookings" on public.bookings;
create policy "team reads bookings" on public.bookings
  for select to authenticated using (true);

drop policy if exists "team updates bookings" on public.bookings;
create policy "team updates bookings" on public.bookings
  for update to authenticated using (true) with check (true);

drop policy if exists "team deletes bookings" on public.bookings;
create policy "team deletes bookings" on public.bookings
  for delete to authenticated using (true);

-- the public website needs to READ the live menu + delivery charge
drop policy if exists "everyone reads kv" on public.kv;
create policy "everyone reads kv" on public.kv
  for select to anon, authenticated using (true);

drop policy if exists "team writes kv" on public.kv;
create policy "team writes kv" on public.kv
  for insert to authenticated with check (true);

drop policy if exists "team updates kv" on public.kv;
create policy "team updates kv" on public.kv
  for update to authenticated using (true) with check (true);

-- ---------- table permissions (RLS above then narrows them down) ----------
grant usage on schema public to anon, authenticated;
grant insert                         on public.orders   to anon;
grant insert                         on public.bookings to anon;
grant select                         on public.kv       to anon;
grant select, insert, update, delete on public.orders   to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
grant select, insert, update         on public.kv       to authenticated;

-- ---------- customer self-cancel ----------
-- Customers can NOT read or edit orders directly. This one function lets them cancel their OWN
-- order (needs the order ID + the phone number used) and only while it is still "new"
-- (table bookings: still "pending"). Safe to run more than once.
create or replace function public.cancel_my_order(p_id text, p_phone text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     text := upper(btrim(coalesce(p_id, '')));
  v_digits text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  v_row    record;
  v_now    text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if v_id = '' or length(v_digits) < 10 then
    return 'not_found';
  end if;

  if v_id like 'TBL-%' then
    select * into v_row from public.bookings where id = v_id for update;
    if not found or right(regexp_replace(coalesce(v_row.data->>'phone', ''), '\D', '', 'g'), 10) <> v_digits then
      return 'not_found';
    end if;
    if v_row.data->>'status' = 'cancelled' then return 'already_cancelled'; end if;
    if v_row.data->>'status' <> 'pending' then return 'too_late'; end if;
    update public.bookings
       set data = data || jsonb_build_object('status', 'cancelled', 'cancelledBy', 'customer', 'updatedAt', v_now)
     where id = v_id;
    return 'ok';
  end if;

  select * into v_row from public.orders where id = v_id for update;
  if not found or right(regexp_replace(coalesce(v_row.data->>'phone', ''), '\D', '', 'g'), 10) <> v_digits then
    return 'not_found';
  end if;
  if v_row.data->>'status' = 'cancelled' then return 'already_cancelled'; end if;
  if v_row.data->>'status' <> 'new' then return 'too_late'; end if;
  update public.orders
     set data = data || jsonb_build_object('status', 'cancelled', 'cancelledBy', 'customer', 'updatedAt', v_now)
   where id = v_id;
  return 'ok';
end;
$$;

revoke all on function public.cancel_my_order(text, text) from public;
grant execute on function public.cancel_my_order(text, text) to anon, authenticated;
