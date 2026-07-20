import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { enviarNotificacaoParaUsuario } from "@/lib/push";

// Envia uma notificação de teste para o usuário atualmente logado.
// Usado pelo botão "Enviar notificação de teste" no Perfil, e serve pra
// confirmar que celular + PC estão realmente recebendo antes de ligarmos
// os disparos automáticos (Parte 2: hábitos, treinos, tarefas, metas, dieta).
export async function POST() {
  const supabase = createClient();

  const {
    data: { user },
    error: erroAuth,
  } = await supabase.auth.getUser();

  if (erroAuth || !user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  try {
    const resultado = await enviarNotificacaoParaUsuario(user.id, {
      title: "Ascen",
      body: "Notificações estão funcionando neste dispositivo. 🎉",
      url: "/perfil",
    });

    if (resultado.totalInscricoes === 0) {
      return NextResponse.json(
        { erro: "Você ainda não ativou notificações em nenhum dispositivo." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, resultado });
  } catch (erro) {
    console.error("Erro ao enviar notificação de teste:", erro);
    return NextResponse.json(
      { erro: "Não foi possível enviar a notificação agora." },
      { status: 500 }
    );
  }
}
