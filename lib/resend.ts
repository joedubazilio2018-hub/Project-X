/**
 * Envio de e-mails transacionais via Resend (usando a API HTTP direto, sem
 * precisar adicionar o pacote "resend" como dependência).
 *
 * ⚠️ Só pode ser importado em código que roda no servidor (Route Handlers,
 * Server Components) — nunca em componentes "use client". Depende de
 * RESEND_API_KEY, que não pode ser exposta ao navegador.
 */

const RESEND_API_URL = "https://api.resend.com/emails";

type EnviarEmailParams = {
  para: string;
  assunto: string;
  html: string;
};

export async function enviarEmail({ para, assunto, html }: EnviarEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !remetente) {
    throw new Error(
      "Resend: defina RESEND_API_KEY e RESEND_FROM_EMAIL nas variáveis de ambiente."
    );
  }

  const resposta = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: remetente,
      to: [para],
      subject: assunto,
      html,
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`Resend: falha ao enviar e-mail (${resposta.status}): ${corpo}`);
  }

  return resposta.json();
}
