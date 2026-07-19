"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { createClient } from "@/lib/supabase-browser";


type StatusAcesso = "verificando" | "aprovado" | "pendente";

const CHAVE_CACHE = "ascen_acesso_aprovado";
const VALIDADE_CACHE_MS = 6 * 60 * 60 * 1000; // 6 horas — evita bater no banco a cada troca de página, mas revalida durante o dia

export default function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const [status, setStatus] = useState<StatusAcesso>("verificando");
    const [souAdmin, setSouAdmin] = useState(false);

  useEffect(() => {
    supabase.rpc("is_admin").then(({ data, error }) => {
      if (!error && data === true) setSouAdmin(true);
    });
  }, [supabase]);


  useEffect(() => {
    // Evita bater no banco a cada troca de página, mas revalida periodicamente
    // (pra não deixar o acesso "preso" como aprovado se o trial vencer ou a
    // assinatura for cancelada com a aba ainda aberta)
    if (typeof window !== "undefined") {
      const cacheBruto = sessionStorage.getItem(CHAVE_CACHE);
      if (cacheBruto) {
        try {
          const { aprovadoEm } = JSON.parse(cacheBruto) as { aprovadoEm: number };
          if (Date.now() - aprovadoEm < VALIDADE_CACHE_MS) {
            setStatus("aprovado");
            return;
          }
        } catch {
          // cache em formato antigo/corrompido — ignora e revalida
        }
      }
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
        sessionStorage.setItem(CHAVE_CACHE, JSON.stringify({ aprovadoEm: Date.now() }));
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
            Acesso não liberado
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Seu período de teste pode ter terminado ou sua assinatura não
            está ativa no momento. Se você acha que isso é um engano, entre
            em contato com o suporte.
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
      <Sidebar souAdmin={souAdmin} />
      <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:py-8 md:pb-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
      <MobileNav souAdmin={souAdmin} />
    </div>
  );
}
