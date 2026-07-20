-- ============================================
-- VIDA EM PROGRESSO — Parte 2: Notificações Push
-- Cole este script no SQL Editor do Supabase
-- (Painel > SQL Editor > New query > Run)
-- ============================================

-- Guarda uma "inscrição" de push por dispositivo/navegador.
-- Um mesmo usuário pode ter várias (celular + PC, por exemplo).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text null, -- útil pra saber depois "esse é o Chrome do PC" etc.
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "Usuários veem apenas suas próprias inscrições"
  on push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Usuários criam apenas suas próprias inscrições"
  on push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam apenas suas próprias inscrições"
  on push_subscriptions for update
  using (auth.uid() = user_id);

create policy "Usuários deletam apenas suas próprias inscrições"
  on push_subscriptions for delete
  using (auth.uid() = user_id);

-- Observação: o envio de notificações (Parte 2 do desenvolvimento) roda no
-- servidor com a service role key, que ignora RLS — por isso as políticas
-- acima só precisam cobrir o que o próprio usuário faz pelo navegador
-- (ativar/desativar notificações).
