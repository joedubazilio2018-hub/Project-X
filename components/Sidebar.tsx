"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const NAV_ITEMS_BASE = [
  { href: "/", label: "Painel" },
  { href: "/habitos", label: "Hábitos" },
  { href: "/tarefas", label: "Tarefas" },
  { href: "/treinos", label: "Treinos" },
  { href: "/metas", label: "Metas" },
  { href: "/diario", label: "Diário" },
  { href: "/financas", label: "Finanças" },
  { href: "/notas", label: "Notas" },
];

const ITEM_ADMIN = { href: "/admin", label: "Admin" };

function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
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

// Menu lateral — visível apenas no desktop (md e acima).
// No mobile, a navegação acontece pela barra inferior (ver components/MobileNav.tsx).
export default function Sidebar({ souAdmin = false }: { souAdmin?: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  const navItems = souAdmin ? [...NAV_ITEMS_BASE, ITEM_ADMIN] : NAV_ITEMS_BASE;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden h-screen w-56 flex-col border-r border-base-border bg-base-surface px-4 py-6 md:flex">
      <div className="mb-8 px-2">
        <h1 className="font-display text-base font-bold text-ink">Ascese</h1>
        <p className="mt-0.5 text-xs text-ink-faint">by JB Group</p>
      </div>
      <NavLinks items={navItems} />
      <Link
        href="/perfil"
        className="rounded-lg px-3 py-2 text-sm font-medium text-ink-faint transition-colors hover:bg-base hover:text-ink"
      >
        Editar perfil
      </Link>
      <button
        onClick={handleSignOut}
        className="rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-faint transition-colors hover:bg-base hover:text-warn"
      >
        Sair
      </button>
    </aside>
  );
}
