"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase-browser";

type StatusAcesso = "verificando" | "aprovado" | "pendente";

const CHAVE_CACHE = "ascen_acesso_aprovado";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const [status, setStatus] = useState<StatusAcesso>("verificando");

  useEffect(() => {
    // Evita bater no banco a cada troca de página dentro da mesma sessão do navegador
    if (typeof window !== "undefined" && sessionStorage.getItem(CHAVE_CACHE) === "true") {
      setStatus("aprovado");
      return;
    }

    async function verificar() {
      const { data, error } = await supabase.rpc("resgatar_acesso");

      if (error) {
        console.error("Erro ao verificar acesso:", error);
        setStatus("pendente");
        return;
      }

      const aprovado = data?.[0]?.aprovado === true;

      if (aprovado && typeof window !== "undefined") {
        sessionStorage.setItem(CHAVE_CACHE, "true");
      }

      setStatus(aprovado ? "aprovado" : "pendente");
    }

    verificar();
  }, [supabase]);

  async function sair() {
    if (typeof window !== "undefined") sessionStorage.removeItem(CHAVE_CACHE);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (status === "verificando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <p className="text-sm text-ink-muted">Carregando...</p>
      </div>
    );
  }

  if (status === "pendente") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base px-4">
        <div className="w-full max-w-sm rounded-xl border border-base-border bg-base-surface p-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
          <h1 className="font-display text-lg font-bold text-ink">
            Acesso aguardando liberação
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Sua conta ainda não foi liberada. Verifique se o código de convite
            usado no cadastro é válido, ou entre em contato com o
            administrador.
          </p>
          <button
            onClick={sair}
            className="mt-6 text-sm font-medium text-ink-muted underline hover:text-ink"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
