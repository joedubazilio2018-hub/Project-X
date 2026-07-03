"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import NotaCard from "@/components/NotaCard";
import NotaModal from "@/components/NotaModal";
import type { Note } from "@/types/database";

export default function NotasPage() {
  const supabase = createClient();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // null = modal fechado; note = editando; "nova" tratado à parte
  const [notaSelecionada, setNotaSelecionada] = useState<Note | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false });
    setNotes((data as Note[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirNovaNota() {
    setNotaSelecionada(null);
    setModalAberto(true);
  }

  function abrirEdicao(note: Note) {
    setNotaSelecionada(note);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setNotaSelecionada(null);
  }

  async function salvarNota(dados: { title: string; content: string; color: string }) {
    setSalvando(true);

    if (notaSelecionada) {
      // edição
      const atualizada = { ...notaSelecionada, ...dados, updated_at: new Date().toISOString() };
      setNotes((prev) =>
        prev.map((n) => (n.id === notaSelecionada.id ? atualizada : n))
      );
      await supabase
        .from("notes")
        .update({ ...dados, updated_at: new Date().toISOString() })
        .eq("id", notaSelecionada.id);
    } else {
      // criação
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setSalvando(false);
        return;
      }
      await supabase.from("notes").insert({ ...dados, user_id: userId });
      carregar();
    }

    setSalvando(false);
    fecharModal();
  }

  async function excluirNota(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notes").delete().eq("id", id);
    fecharModal();
  }

  return (
    <AppShell>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Notas</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Seus post-its rápidos, sempre à mão.
          </p>
        </div>
        <button
          onClick={abrirNovaNota}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          + Nova nota
        </button>
      </header>

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
          <p className="text-sm text-ink-muted">
            Você ainda não tem notas. Crie a primeira!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {notes.map((note) => (
            <NotaCard key={note.id} note={note} onClick={() => abrirEdicao(note)} />
          ))}
        </div>
      )}

      {modalAberto && (
        <NotaModal
          note={notaSelecionada}
          onClose={fecharModal}
          onSave={salvarNota}
          onDelete={excluirNota}
          salvando={salvando}
        />
      )}
    </AppShell>
  );
}
