"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const NAV_ITEMS_BASE = [
  { href: "/", label: "Painel" },
  { href: "/habitos", label: "Hábitos" },
  { href: "/metas", label: "Metas" },
  { href: "/diario", label: "Diário" },
  { href: "/financas", label: "Finanças" },
  { href: "/notas", label: "Notas" },
];

const ITEM_ADMIN = { href: "/admin", label: "Admin" };

function NavLinks({
  items,
  onNavigate,
}: {
  items: { href: string; label: string }[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-accent-dim text-accent"
                : "text-ink-muted hover:bg-base hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const supabase = createClient();
  const [aberto, setAberto] = useState(false);
  const [souAdmin, setSouAdmin] = useState(false);

  useEffect(() => {
    // Verifica silenciosamente se o usuário logado é administrador.
    // Só ele vê o link extra "Admin" — para qualquer outra pessoa, isto
    // retorna false e o link nunca aparece.
    supabase.rpc("is_admin").then(({ data, error }) => {
      if (!error && data === true) setSouAdmin(true);
    });
  }, [supabase]);

  const navItems = souAdmin ? [...NAV_ITEMS_BASE, ITEM_ADMIN] : NAV_ITEMS_BASE;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Barra de topo — visível apenas no mobile (md:hidden) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-base-border bg-base-surface px-4 py-3 md:hidden">
        <h1 className="font-display text-base font-bold text-ink">
          Ascen
        </h1>
        <button
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink transition-colors hover:bg-base"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Sidebar fixa — visível apenas no desktop (md e acima) */}
      <aside className="hidden h-screen w-56 flex-col border-r border-base-border bg-base-surface px-4 py-6 md:flex">
        <div className="mb-8 px-2">
          <h1 className="font-display text-base font-bold text-ink">
            Ascen
          </h1>
          <p className="mt-0.5 text-xs text-ink-faint">by JB Group</p>
        </div>
        <NavLinks items={navItems} />
        <button
          onClick={handleSignOut}
          className="rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-faint transition-colors hover:bg-base hover:text-warn"
        >
          Sair
        </button>
      </aside>

      {/* Drawer — visível apenas no mobile, quando aberto */}
      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Fundo escurecido — tocar fora fecha o menu */}
          <button
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="absolute inset-0 bg-black/60"
          />
          {/* Painel do menu, deslizando da esquerda */}
          <aside className="relative flex h-full w-64 max-w-[80%] flex-col border-r border-base-border bg-base-surface px-4 py-6 shadow-xl">
            <div className="mb-8 flex items-center justify-between px-2">
              <div>
                <h1 className="font-display text-base font-bold text-ink">
                  Ascen
                </h1>
                <p className="mt-0.5 text-xs text-ink-faint">by JB Group</p>
              </div>
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-base hover:text-ink"
              >
                ✕
              </button>
            </div>
            <NavLinks items={navItems} onNavigate={() => setAberto(false)} />
            <button
              onClick={handleSignOut}
              className="rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-faint transition-colors hover:bg-base hover:text-warn"
            >
              Sair
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
