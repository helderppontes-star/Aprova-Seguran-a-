-- Aprova Segurança: schema inicial para contas e liberação manual do Premium.
-- Execute no SQL Editor do seu projeto Supabase.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  premium_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.premium_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  amount_cents integer not null default 199 check (amount_cents = 199),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  transaction_reference text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create index if not exists premium_requests_status_created_idx
  on public.premium_requests(status, created_at desc);
create index if not exists premium_requests_user_idx
  on public.premium_requests(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.premium_requests enable row level security;

-- Helper SECURITY DEFINER evita recursão da policy ao consultar a própria tabela profiles.
create or replace function public.is_current_user_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  );
$$;
revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists "profile read self or admin" on public.profiles;
create policy "profile read self or admin" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_current_user_admin());

drop policy if exists "request read own or admin" on public.premium_requests;
create policy "request read own or admin" on public.premium_requests
for select to authenticated
using (user_id = auth.uid() or public.is_current_user_admin());

drop policy if exists "user create own request" on public.premium_requests;
create policy "user create own request" on public.premium_requests
for insert to authenticated
with check (
  user_id = auth.uid()
  and email = (select email from auth.users where id = auth.uid())
  and status = 'pending'
  and reviewed_at is null
  and reviewed_by is null
  and amount_cents = 199
);

-- Novas contas recebem perfil comum; nunca são administradoras automaticamente.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, false)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RPC protegida: somente administrador pode aprovar. Concede 30 dias,
-- somando ao período Premium ainda vigente.
create or replace function public.approve_premium_request(request_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  req public.premium_requests%rowtype;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception 'Apenas o administrador pode aprovar solicitações.';
  end if;

  select * into req from public.premium_requests where id = request_id for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if req.status <> 'pending' then raise exception 'Esta solicitação já foi analisada.'; end if;

  update public.profiles
  set premium_until = greatest(coalesce(premium_until, now()), now()) + interval '30 days'
  where id = req.user_id;

  update public.premium_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = request_id;
end;
$$;

create or replace function public.reject_premium_request(request_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception 'Apenas o administrador pode recusar solicitações.';
  end if;
  update public.premium_requests
  set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  where id = request_id and status = 'pending';
  if not found then raise exception 'Solicitação não encontrada ou já analisada.'; end if;
end;
$$;

revoke all on function public.approve_premium_request(uuid) from public;
revoke all on function public.reject_premium_request(uuid) from public;
grant execute on function public.approve_premium_request(uuid) to authenticated;
grant execute on function public.reject_premium_request(uuid) to authenticated;

grant select on public.profiles to authenticated;
grant select, insert on public.premium_requests to authenticated;

-- Depois de criar sua própria conta pelo aplicativo, torne-a administradora:
-- substitua o e-mail abaixo pelo e-mail exato usado no cadastro.
-- update public.profiles p set is_admin = true
-- from auth.users u where p.id = u.id and u.email = 'SEU_EMAIL_AQUI';
