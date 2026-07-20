import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente "admin" do Supabase — usa a SERVICE ROLE KEY e por isso ignora
 * o RLS (Row Level Security).
 *
 * ⚠️ NUNCA importe este arquivo em um componente "use client" ou em
 * qualquer código que rode no navegador. Ele só pode ser usado dentro de
 * Route Handlers (app/api/**) ou Server Components, onde
 * SUPABASE_SERVICE_ROLE_KEY está disponível e não é exposta ao público.
 *
 * É necessário porque o envio de notificações (feito pelo servidor, sem
 * usuário logado) precisa ler as inscrições (push_subscriptions) e dados
 * de tarefas/metas/treinos/dieta de TODOS os usuários para decidir quem
 * avisar — algo que as políticas de RLS (pensadas para o próprio usuário)
 * não permitem.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
