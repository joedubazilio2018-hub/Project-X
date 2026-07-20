import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";

// ⚠️ Este arquivo só deve ser importado em código de servidor
// (app/api/**), nunca em componentes "use client".

let vapidConfigurado = false;

function garantirVapidConfigurado() {
  if (vapidConfigurado) return;

  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const chavePrivada = process.env.VAPID_PRIVATE_KEY;
  const assunto = process.env.VAPID_SUBJECT || "mailto:contato@example.com";

  if (!chavePublica || !chavePrivada) {
    throw new Error(
      "Chaves VAPID não configuradas. Defina NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nas variáveis de ambiente (veja .env.example)."
    );
  }

  webpush.setVapidDetails(assunto, chavePublica, chavePrivada);
  vapidConfigurado = true;
}

export type NotificacaoPayload = {
  title: string;
  body: string;
  url?: string; // pra onde o app abre quando o usuário clica na notificação
};

export type ResultadoEnvio = {
  totalInscricoes: number;
  enviadasComSucesso: number;
  inscricoesRemovidas: number;
};

/**
 * Envia uma notificação push para TODAS as inscrições (celular, PC, etc.)
 * de um usuário. Remove automaticamente inscrições que não existem mais
 * (ex: usuário desinstalou o app ou limpou os dados do navegador).
 */
export async function enviarNotificacaoParaUsuario(
  userId: string,
  payload: NotificacaoPayload
): Promise<ResultadoEnvio> {
  garantirVapidConfigurado();

  const admin = createAdminClient();

  const { data: inscricoes, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Erro ao buscar inscrições push: ${error.message}`);
  }

  if (!inscricoes || inscricoes.length === 0) {
    return { totalInscricoes: 0, enviadasComSucesso: 0, inscricoesRemovidas: 0 };
  }

  let enviadasComSucesso = 0;
  let inscricoesRemovidas = 0;

  await Promise.all(
    inscricoes.map(async (inscricao) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
          },
          JSON.stringify(payload)
        );
        enviadasComSucesso++;
      } catch (erro: unknown) {
        const statusCode = (erro as { statusCode?: number })?.statusCode;
        // 404/410 = a inscrição não existe mais do lado do navegador/push service.
        // Removemos do banco pra não tentar de novo pra sempre.
        if (statusCode === 404 || statusCode === 410) {
          inscricoesRemovidas++;
          await admin.from("push_subscriptions").delete().eq("id", inscricao.id);
        } else {
          console.error("Erro ao enviar push:", erro);
        }
      }
    })
  );

  return {
    totalInscricoes: inscricoes.length,
    enviadasComSucesso,
    inscricoesRemovidas,
  };
}
