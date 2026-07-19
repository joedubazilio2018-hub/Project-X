"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro não tratado:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm rounded-xl border border-base-border bg-base-surface p-6 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warn/10">
            <span className="text-2xl">⚠️</span>
          </div>
        </div>
        <h1 className="font-display text-lg font-bold text-ink">
          Algo deu errado
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Não foi possível carregar essa página agora. Tenta de novo em
          instantes.
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
