"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const ABAS_PRINCIPAIS = [
  { href: "/painel", label: "Painel", icon: IconePainel },
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
          onClick={() => setMaisAberto((v) => !v)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
          aria-label="Mais opções"
        >
          <IconeMais className={`h-5 w-5 ${maisAtivo ? "text-accent" : "text-ink-faint"}`} />
          <span className={`text-[10px] font-medium ${maisAtivo ? "text-accent" : "text-ink-faint"}`}>
            Mais
          </span>
        </button>
      </nav>

      {/* Área invisível que fecha o menu ao tocar fora — sem escurecer a tela */}
      {maisAberto && (
        <button
          aria-label="Fechar"
          onClick={() => setMaisAberto(false)}
          className="fixed inset-0 z-30 bg-transparent md:hidden"
        />
      )}

      {/* Menu "Mais" — nasce do próprio botão, sem sheet de tela cheia */}
      <div
        className={`fixed right-3 z-40 w-52 origin-bottom-right rounded-2xl border border-base-border bg-base-surface p-2 shadow-2xl transition-all duration-200 ease-out md:hidden ${
          maisAberto
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-90 opacity-0"
        }`}
        style={{
          bottom: "calc(64px + env(safe-area-inset-bottom) + 8px)",
        }}
      >
        <div className="flex flex-col gap-0.5">
          {itensMais.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMaisAberto(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                pathname === item.href
                  ? "bg-accent-dim text-accent"
                  : "text-ink-muted hover:bg-base"
              }`}
            >
              <span className="text-base leading-none">{item.emoji}</span>
              {item.label}
            </Link>
          ))}
          <Link
            href="/perfil"
            onClick={() => setMaisAberto(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
              pathname === "/perfil"
                ? "bg-accent-dim text-accent"
                : "text-ink-muted hover:bg-base"
            }`}
          >
            <span className="text-base leading-none">👤</span>
            Perfil
          </Link>
          <div className="my-1 border-t border-base-border" />
          <button
            onClick={sair}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink-faint hover:bg-base hover:text-warn"
          >
            <span className="text-base leading-none">🚪</span>
            Sair
          </button>
        </div>
      </div>
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
