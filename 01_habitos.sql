-- ============================================
-- VIDA EM PROGRESSO — Parte 1: Hábitos
-- Cole este script no SQL Editor do Supabase
-- (Painel > SQL Editor > New query > Run)
-- ============================================

-- Tabela de hábitos
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  target_days int[] default null, -- ex: [1,3,5] = seg, qua, sex. null = todo dia
  color text not null default '#2DD4BF',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tabela de check-ins diários
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  done boolean not null default true,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- Índices pra acelerar consultas comuns
create index if not exists idx_habits_user on habits(user_id);
create index if not exists idx_habit_logs_user_date on habit_logs(user_id, date);
create index if not exists idx_habit_logs_habit on habit_logs(habit_id);

-- ============================================
-- Row Level Security (RLS)
-- Garante que cada usuário só vê os próprios dados
-- ============================================

alter table habits enable row level security;
alter table habit_logs enable row level security;

create policy "Usuários veem apenas seus próprios hábitos"
  on habits for select
  using (auth.uid() = user_id);

create policy "Usuários criam apenas seus próprios hábitos"
  on habits for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam apenas seus próprios hábitos"
  on habits for update
  using (auth.uid() = user_id);

create policy "Usuários deletam apenas seus próprios hábitos"
  on habits for delete
  using (auth.uid() = user_id);

create policy "Usuários veem apenas seus próprios check-ins"
  on habit_logs for select
  using (auth.uid() = user_id);

create policy "Usuários criam apenas seus próprios check-ins"
  on habit_logs for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam apenas seus próprios check-ins"
  on habit_logs for update
  using (auth.uid() = user_id);

create policy "Usuários deletam apenas seus próprios check-ins"
  on habit_logs for delete
  using (auth.uid() = user_id);
