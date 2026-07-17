"use client";

import type { Note } from "@/types/database";

export const CORES_NOTA: Record<string, string> = {
  default: "#57575B",
  teal: "#E8541E",
  amber: "#D9A448",
  coral: "#D9455F",
  blue: "#3E7CB8",
  purple: "#8A6FD9",
};

function formatarDataCurta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type NotaCardProps = {
  note: Note;
  onClick: () => void;
};

export default function NotaCard({ note, onClick }: NotaCardProps) {
  const cor = CORES_NOTA[note.color] ?? CORES_NOTA.default;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[130px] flex-col justify-between rounded-xl border border-base-border bg-base-surface p-4 text-left transition-colors hover:border-base-border/60"
      style={{ borderTop: `3px solid ${cor}` }}
    >
      <div>
        <p className="line-clamp-1 text-sm font-semibold text-ink">
          {note.title || "Sem título"}
        </p>
        <p className="mt-1.5 line-clamp-4 text-xs text-ink-muted">
          {note.content || "Nota vazia"}
        </p>
      </div>
      <p className="mt-3 text-[11px] text-ink-faint">
        {formatarDataCurta(note.updated_at)}
      </p>
    </button>
  );
}
