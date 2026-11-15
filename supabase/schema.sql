-- Aprova Segurança: schema inicial para Supabase/Postgres.
-- Execute no SQL Editor do projeto. Nunca exponha a chave service_role no cliente.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'candidate' check (role in ('candidate', 'owner')),
  premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'owner'
  );
$$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

create policy "Candidates can read own profile; owner can read all"
on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select public.is_owner()));

-- Cliente pode criar somente perfil padrão do próprio usuário.
create policy "Users can create own candidate profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id and role = 'candidate' and premium = false);

-- Usuários não podem elevar papel nem ativar Premium. Owner realiza gestão manual.
create policy "Owner manages profile access"
on public.profiles for update to authenticated
using ((select public.is_owner()))
with check ((select public.is_owner()));

create table if not exists public.contests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  career text not null,
  institution text,
  status text not null check (status in ('open', 'expected')),
  source_url text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint contest_source_required check (source_url is not null and length(trim(source_url)) > 0)
);
alter table public.contests enable row level security;
create policy "Published verified contests are readable"
on public.contests for select to anon, authenticated
using (verified_at is not null and source_url is not null);
create policy "Owner manages contests"
on public.contests for all to authenticated
using ((select public.is_owner()))
with check ((select public.is_owner()));

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  explanation text,
  source_url text,
  is_official boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.questions enable row level security;
create policy "Questions are readable when published"
on public.questions for select to anon, authenticated using (true);
create policy "Owner manages questions"
on public.questions for all to authenticated
using ((select public.is_owner()))
with check ((select public.is_owner()));

-- Após criar a conta do proprietário no Auth, associe seu UUID no SQL Editor:
-- insert into public.profiles (id, role) values ('UUID_DO_USUARIO', 'owner')
-- on conflict (id) do update set role = 'owner';
-- Ativação manual de Premium depois da confirmação do PIX:
-- update public.profiles set premium = true, updated_at = now() where id = 'UUID_DO_CANDIDATO';
