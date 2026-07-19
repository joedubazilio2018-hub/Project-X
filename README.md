# Vida em Progresso

App pessoal de acompanhamento de hábitos, metas, diário e finanças.

Esta é a **Parte 1** do projeto: estrutura base, login, dashboard e módulo de hábitos.

## O que já funciona nesta entrega

- Login e criação de conta (Supabase Auth)
- Dashboard com resumo do dia, sequência (streak) e gráfico dos últimos 7 dias
- Módulo de Hábitos: criar, marcar check-in diário, arquivar
- Tema dark
- Menu de navegação já com os links para Metas, Diário e Finanças (essas páginas chegam nas próximas partes)

## Passo 1 — Configurar o banco de dados no Supabase

1. Entre no [painel do Supabase](https://supabase.com/dashboard) e abra seu projeto
2. No menu lateral, clique em **SQL Editor**
3. Clique em **New query**
4. Abra o arquivo `supabase/01_habitos.sql` desta pasta, copie todo o conteúdo, cole no editor
5. Clique em **Run**

Isso cria as tabelas `habits` e `habit_logs`, já com segurança configurada (cada pessoa só vê os próprios dados).

## Passo 2 — Instalar e rodar localmente

Você vai precisar do [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente).

```bash
# dentro da pasta do projeto
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — vai cair na tela de login. Clique em "Criar conta" e use seu e-mail e uma senha.

> O arquivo `.env.local` já está com as credenciais do seu projeto Supabase configuradas. **Não suba esse arquivo pro GitHub** — ele já está no `.gitignore`, mas vale checar.

## Passo 3 — Subir pro GitHub

```bash
git init
git add .
git commit -m "Primeira versão: login, dashboard e hábitos"
git branch -M main
git remote add origin <URL do seu repositório no GitHub>
git push -u origin main
```

## Passo 4 — Deploy na Vercel

1. Entre em [vercel.com/new](https://vercel.com/new) e importe o repositório do GitHub
2. Antes de clicar em "Deploy", abra **Environment Variables** e adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` → cole a URL do seu projeto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → cole a chave anon pública
3. Clique em **Deploy**

Depois disso, toda vez que você der `git push`, a Vercel atualiza o site automaticamente.

## Confirmação de e-mail (opcional, recomendado desativar para uso pessoal)

Por padrão, o Supabase pode exigir confirmação por e-mail ao criar conta. Como este é um app de uso pessoal, você pode desativar isso para simplificar:

1. No painel do Supabase: **Authentication** → **Providers** → **Email**
2. Desmarque **Confirm email**
3. Salve

## Estrutura de pastas

```
app/
  layout.tsx          → layout raiz (fontes, tema)
  page.tsx            → dashboard (página inicial)
  globals.css         → estilos globais
  login/page.tsx       → tela de login
  habitos/page.tsx     → módulo de hábitos
  metas/page.tsx       → placeholder (parte 2)
  diario/page.tsx      → placeholder (parte 2)
  financas/page.tsx    → placeholder (parte 3)
components/
  Sidebar.tsx          → menu lateral
  AppShell.tsx         → layout das páginas internas
lib/
  supabase-browser.ts  → cliente Supabase (navegador)
  supabase-server.ts   → cliente Supabase (servidor)
types/
  database.ts          → tipos TypeScript das tabelas
supabase/
  01_habitos.sql        → script de criação das tabelas
middleware.ts           → protege rotas, exige login
```

## Próximas entregas

- **Parte 2:** Metas de longo prazo + Diário de reflexão
- **Parte 3:** Finanças (lançamentos, categorias, metas financeiras, gráficos)
