import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm rounded-xl border border-base-border bg-base-surface p-6 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink/10">
            <span className="text-2xl">🔍</span>
          </div>
        </div>
        <h1 className="font-display text-lg font-bold text-ink">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          O endereço que você tentou acessar não existe ou foi movido.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
