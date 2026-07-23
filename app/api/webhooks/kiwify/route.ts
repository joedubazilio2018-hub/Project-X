import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { enviarEmail } from "@/lib/resend";

// Eventos que liberam acesso (ver lista completa de triggers possíveis em
// https://docs.kiwify.com.br/api-reference/webhooks/create)
const EVENTOS_APROVACAO = new Set(["compra_aprovada", "subscription_renewed"]);

// Eventos que devem desativar um código ainda não utilizado.
// Revogar o acesso de quem JÁ usou o código é uma Parte 2 — depende de como
// a função resgatar_acesso() do banco decide "aprovado" (ver observação
// no README do projeto / mensagem de acompanhamento).
const EVENTOS_CANCELAMENTO = new Set([
  "compra_reembolsada",
  "chargeback",
  "subscription_canceled",
]);

function gerarCodigoAleatorio(): string {
  // Mesmo padrão usado no painel admin (app/admin/page.tsx), pra manter
  // os códigos gerados manualmente e automaticamente no mesmo formato.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let sufixo = "";
  for (let i = 0; i < 6; i++) {
    sufixo += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ASC-${sufixo}`;
}

function emailDeAcessoHtml(codigo: string, nome: string): string {
  const urlApp = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h1 style="font-size: 20px;">Seu acesso está liberado 🎉</h1>
      <p>Olá${nome ? `, ${nome}` : ""}! Seu pagamento foi aprovado. Use o código abaixo na hora de criar sua conta:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; background: #16161B; color: #E8541E; padding: 16px; border-radius: 12px; text-align: center;">
        ${codigo}
      </p>
      <ol style="line-height: 1.7;">
        <li>Acesse ${urlApp ? `<a href="${urlApp}/login">${urlApp}/login</a>` : "a página de login"}</li>
        <li>Clique em "Criar conta"</li>
        <li>Cole o código no campo "Código de convite (opcional)"</li>
      </ol>
      <p style="color: #666; font-size: 13px;">Dúvidas? Responda este e-mail.</p>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  // 1) Confirma que a chamada realmente veio da Kiwify e não de um terceiro
  //    tentando gerar códigos de graça. A Kiwify costuma enviar o token
  //    configurado no webhook como query string (?signature=SEU_TOKEN) — mas
  //    isso AINDA PRECISA SER CONFIRMADO com um teste real (botão "Testar
  //    Webhook" no painel deles) antes de considerar validado de verdade.
  const tokenEsperado = process.env.KIWIFY_WEBHOOK_TOKEN;
  const tokenRecebido = req.nextUrl.searchParams.get("signature");

  if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });
  }

  // Log completo — essencial nos primeiros testes pra confirmar os nomes
  // exatos dos campos que a Kiwify realmente está mandando (ver Vercel →
  // aba "Logs" do projeto depois de disparar um teste).
  console.log("[kiwify webhook] payload recebido:", JSON.stringify(payload));

  const evento: string | undefined = payload?.webhook_event_type ?? payload?.order_status;
  const email: string | undefined = payload?.Customer?.email ?? payload?.customer?.email;
  const nome: string | undefined = payload?.Customer?.full_name ?? payload?.customer?.full_name;
  const orderId: string | undefined = payload?.order_id ?? payload?.order_ref;

  if (!evento) {
    return NextResponse.json({ erro: "Evento não identificado no payload." }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (EVENTOS_APROVACAO.has(evento)) {
    if (!email) {
      return NextResponse.json(
        { erro: "E-mail do comprador não encontrado no payload." },
        { status: 400 }
      );
    }

    const codigo = gerarCodigoAleatorio();

    const { error: erroInsercao } = await supabase.from("invite_codes").insert({
      code: codigo,
      max_uses: 1,
      note: `Kiwify · ${email}${orderId ? ` · pedido ${orderId}` : ""}`,
    });

    if (erroInsercao) {
      console.error("[kiwify webhook] erro ao criar invite_code:", erroInsercao);
      return NextResponse.json({ erro: "Falha ao gerar código de acesso." }, { status: 500 });
    }

    try {
      await enviarEmail({
        para: email,
        assunto: "Seu acesso está liberado 🎉",
        html: emailDeAcessoHtml(codigo, nome ?? ""),
      });
    } catch (erroEmail) {
      // O código já foi criado no banco — nesse caso vale só registrar o
      // erro (dá pra reenviar manualmente pelo /admin), e NÃO retornar erro
      // pra Kiwify, senão ela reenvia o webhook e gera um código duplicado.
      console.error("[kiwify webhook] erro ao enviar e-mail:", erroEmail);
    }

    return NextResponse.json({ ok: true, codigo });
  }

  if (EVENTOS_CANCELAMENTO.has(evento)) {
    // Por enquanto só desativamos o código se ele ainda não foi usado
    // (uses_count = 0). Revogar o acesso de quem JÁ resgatou o código é a
    // Parte 2 desta integração.
    if (email) {
      await supabase
        .from("invite_codes")
        .update({ active: false })
        .ilike("note", `%${email}%`)
        .eq("uses_count", 0);
    }
    return NextResponse.json({ ok: true });
  }

  // Outros eventos (boleto_gerado, pix_gerado, carrinho_abandonado etc.) —
  // por enquanto só confirmamos o recebimento, sem nenhuma ação.
  return NextResponse.json({ ok: true, ignorado: evento });
}
