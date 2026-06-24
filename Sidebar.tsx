"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const NAV_ITEMS = [
  { href: "/", label: "Painel" },
  { href: "/habitos", label: "Hábitos" },
  { href: "/metas", label: "Metas" },
  { href: "/diario", label: "Diário" },
  { href: "/financas", label: "Finanças" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-base-border bg-base-surface px-4 py-6">
      <div className="mb-8 px-2">
        <h1 className="font-display text-base font-bold text-ink">
          Vida em Progresso
        </h1>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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

      <button
        onClick={handleSignOut}
        className="rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-faint transition-colors hover:bg-base hover:text-warn"
      >
        Sair
      </button>
    </aside>
  );
}
