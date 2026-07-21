"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

/**
 * Botão que:
 * 1. Verifica se o navegador suporta Web Push e se já foi ativado
 * 2. Pede permissão ao usuário quando ele clica
 * 3. Salva a inscrição (subscription) no Supabase
 * 4. Permite desativar (remove a inscrição do banco)
 */
export default function BotaoNotificacao() {
  const supabase = createClient();
  const [suporte, setSuporte] = useState(false);
  const [status, setStatus] = useState<"inativo" | "ativo" | "negado" | "carregando">("carregando");
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [mensagemTeste, setMensagemTeste] = useState<string | null>(null);

  useEffect(() => {
    // Checa se o navegador tem suporte a service worker + push + notification
    const temSuporteTotal =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setSuporte(temSuporteTotal);

    if (!temSuporteTotal) return;

    // Checa permissão atual
    if (Notification.permission === "denied") {
      setStatus("negado");
      return;
    }

    // Checa se já existe uma inscrição ativa
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setStatus(sub ? "ativo" : "inativo");
      });
    });
  }, []);

  async function ativar() {
    setStatus("carregando");
    try {
      const registration = await navigator.serviceWorker.ready;
      const permissao = await Notification.requestPermission();

      if (permissao !== "granted") {
        setStatus("negado");
        return;
      }

      const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!chavePublica) {
        console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada.");
        setStatus("inativo");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(chavePublica).buffer as ArrayBuffer,
      });

      const json = subscription.toJSON();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: json.endpoint!,
          p256dh: (json.keys as Record<string, string>)?.p256dh ?? "",
          auth: (json.keys as Record<string, string>)?.auth ?? "",
        },
        { onConflict: "user_id,endpoint" }
      );

      setStatus("ativo");
    } catch (erro) {
      console.error("Erro ao ativar notificações:", erro);
      setStatus("inativo");
    }
  }

  async function desativar() {
    setStatus("carregando");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      }
      setStatus("inativo");
    } catch (erro) {
      console.error("Erro ao desativar notificações:", erro);
      setStatus("ativo");
    }
  }

  async function enviarTeste() {
    setEnviandoTeste(true);
    setMensagemTeste(null);
    try {
      const resposta = await fetch("/api/notificacoes/teste", { method: "POST" });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setMensagemTeste(dados.erro || "Não foi possível enviar agora.");
        return;
      }
      setMensagemTeste("Notificação enviada! Confira seu dispositivo.");
    } catch {
      setMensagemTeste("Não foi possível enviar agora.");
    } finally {
      setEnviandoTeste(false);
    }
  }

  // Não mostra nada se o navegador não tiver suporte
  if (!suporte) return null;

  if (status === "negado") {
    return (
      <p className="text-xs text-ink-faint">
        Notificações bloqueadas. Libere nas configurações do navegador.
      </p>
    );
  }

  if (status === "carregando") {
    return <p className="text-xs text-ink-faint">Verificando notificações...</p>;
  }

  if (status === "ativo") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Notificações ativadas neste dispositivo
          </span>
          <button
            onClick={desativar}
            className="text-xs text-ink-faint underline hover:text-warn"
          >
            Desativar
          </button>
        </div>
        <button
          onClick={enviarTeste}
          disabled={enviandoTeste}
          className="w-fit text-xs text-ink-faint underline hover:text-accent disabled:opacity-50"
        >
          {enviandoTeste ? "Enviando..." : "Enviar notificação de teste"}
        </button>
        {mensagemTeste && (
          <p className="text-xs text-ink-faint">{mensagemTeste}</p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={ativar}
      className="rounded-lg border border-base-border px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
    >
      🔔 Ativar lembretes diários
    </button>
  );
}

// Converte a chave VAPID pública (base64url) para Uint8Array,
// formato exigido pelo PushManager.subscribe()
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
