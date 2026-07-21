-- ============================================
-- VIDA EM PROGRESSO — Parte 3: Água
-- Cole este script no SQL Editor do Supabase
-- (Painel > SQL Editor > New query > Run)
-- ============================================

-- Guarda o total de ml bebidos por dia e a meta diária (editável pelo
-- usuário). Uma linha por usuário/dia — cada tap em "+ copo" atualiza o
-- total do dia com upsert.
create table if not exists water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  ml int not null default 0,
  goal_ml int not null default 2000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_water_logs_user_date on water_logs(user_id, date);

alter table water_logs enable row level security;

create policy "Usuários veem apenas seus próprios registros de água"
  on water_logs for select
  using (auth.uid() = user_id);

create policy "Usuários criam apenas seus próprios registros de água"
  on water_logs for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam apenas seus próprios registros de água"
  on water_logs for update
  using (auth.uid() = user_id);

create policy "Usuários deletam apenas seus próprios registros de água"
  on water_logs for delete
  using (auth.uid() = user_id);
