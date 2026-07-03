"use client";

import { useState } from "react";
import type { Note } from "@/types/database";
import { CORES_NOTA } from "./NotaCard";

type NotaModalProps = {
  note: Note | null; // null = criando uma nota nova
  onClose: () => void;
  onSave: (dados: { title: string; content: string; color: string }) => void;
  onDelete: (id: string) => void;
  salvando: boolean;
};

export default function NotaModal({
  note,
  onClose,
  onSave,
  onDelete,
  salvando,
}: NotaModalProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [color, setColor] = useState(note?.color ?? "default");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  function handleSalvar() {
    onSave({ title: title.trim(), content: content.trim(), color });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-base-border bg-base-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-ink-faint">
            {note ? "Editando nota" : "Nova nota"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint hover:text-ink"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          className="mb-2 w-full rounded-lg border border-base-border bg-base px-3 py-2 text-sm font-medium text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva sua anotação..."
          rows={6}
          className="mb-3 w-full resize-none rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />

        <div className="mb-4 flex items-center gap-2">
          {Object.entries(CORES_NOTA).map(([chave, hex]) => (
            <button
              key={chave}
              type="button"
              onClick={() => setColor(chave)}
              aria-label={`Cor ${chave}`}
              className="h-5 w-5 rounded-full transition-transform"
              style={{
                backgroundColor: hex,
                outline: color === chave ? `2px solid ${hex}` : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </div>

        {confirmandoExclusao ? (
          <div className="flex items-center justify-between rounded-lg border border-warn/40 bg-warn-dim px-3 py-2.5">
            <span className="text-xs text-warn">Excluir esta nota?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(false)}
                className="text-xs font-medium text-ink-muted hover:text-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => note && onDelete(note.id)}
                className="text-xs font-semibold text-warn hover:underline"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {note ? (
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(true)}
                className="text-xs font-medium text-ink-faint hover:text-warn"
              >
                Excluir nota
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando || (!title.trim() && !content.trim())}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {note ? "Salvar alterações" : "Criar nota"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
