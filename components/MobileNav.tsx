"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const ABAS_PRINCIPAIS = [
  { href: "/", label: "Painel", icon: IconePainel },
  { href: "/habitos", label: "Hábitos", icon: IconeHabitos },
  { href: "/tarefas", label: "Tarefas", icon: IconeTarefas },
  { href: "/financas", label: "Finanças", icon: IconeFinancas },
];

const ITENS_MAIS_BASE = [
  { href: "/treinos", label: "Treinos", emoji: "🏋️" },
  { href: "/metas", label: "Metas", emoji: "🎯" },
  { href: "/diario", label: "Diário", emoji: "📔" },
  { href: "/notas", label: "Notas", emoji: "🗒️" },
];


const ITEM_ADMIN = { href: "/admin", label: "Admin", emoji: "🛠️" };

export default function MobileNav({ souAdmin = false }: { souAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [maisAberto, setMaisAberto] = useState(false);

  const itensMais = souAdmin ? [...ITENS_MAIS_BASE, ITEM_ADMIN] : ITENS_MAIS_BASE;
  const maisAtivo = itensMais.some((item) => pathname === item.href) ||
    pathname === "/perfil";

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-base-border bg-base-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {ABAS_PRINCIPAIS.map((aba) => {
          const ativo = pathname === aba.href;
          const Icone = aba.icon;
          return (
            <Link
              key={aba.href}
              href={aba.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
            >
              <Icone className={`h-5 w-5 ${ativo ? "text-accent" : "text-ink-faint"}`} />
              <span className={`text-[10px] font-medium ${ativo ? "text-accent" : "text-ink-faint"}`}>
                {aba.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => setMaisAberto(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
          aria-label="Mais opções"
        >
          <IconeMais className={`h-5 w-5 ${maisAtivo ? "text-accent" : "text-ink-faint"}`} />
          <span className={`text-[10px] font-medium ${maisAtivo ? "text-accent" : "text-ink-faint"}`}>
            Mais
          </span>
        </button>
      </nav>

      {maisAberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Fechar"
            onClick={() => setMaisAberto(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-base-border bg-base-surface px-4 pb-6 pt-4 shadow-xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-base-border" />
            <div className="grid grid-cols-3 gap-3">
              {itensMais.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMaisAberto(false)}
                  className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border text-center ${
                    pathname === item.href
                      ? "border-accent/40 bg-accent-dim text-accent"
                      : "border-base-border bg-base text-ink-muted hover:bg-base-border/40"
                  }`}
                >
                  <span className="text-2xl leading-none">{item.emoji}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              ))}
              <Link
                href="/perfil"
                onClick={() => setMaisAberto(false)}
                className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border text-center ${
                  pathname === "/perfil"
                    ? "border-accent/40 bg-accent-dim text-accent"
                    : "border-base-border bg-base text-ink-muted hover:bg-base-border/40"
                }`}
              >
                <span className="text-2xl leading-none">👤</span>
                <span className="text-xs font-medium">Perfil</span>
              </Link>
            </div>
            <button
              onClick={sair}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-ink-faint hover:bg-base hover:text-warn"
            >
              <span>🚪</span>
              Sair
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function IconePainel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function IconeHabitos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3L15.5 9.5" />
    </svg>
  );
}

function IconeTarefas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function IconeFinancas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function IconeMais({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
