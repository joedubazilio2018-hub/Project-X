import Link from "next/link";

function saudacaoPorHorario(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default function GreetingHeader({ nome }: { nome: string }) {
  const saudacao = saudacaoPorHorario();

  return (
    <header className="mb-6 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl font-bold text-ink sm:text-[28px]">
          {saudacao}
          {nome ? `, ${nome}.` : "."}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Aqui está seu progresso recente.</p>
      </div>
      <Link
        href="/perfil"
        aria-label="Notificações"
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-base-border bg-base-surface text-ink-muted hover:text-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M9.5 20a2.5 2.5 0 0 0 5 0" />
        </svg>
      </Link>
    </header>
  );
}
