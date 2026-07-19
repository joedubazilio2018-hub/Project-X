"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import NotaCard from "@/components/NotaCard";
import NotaModal from "@/components/NotaModal";
import type { Note, NoteColor } from "@/types/database";
import { useToast } from "@/components/ToastProvider";

const MSG_ERRO_PADRAO = "Não deu pra salvar agora. Tenta de novo em instantes.";
const MSG_ERRO_CARREGAR = "Não deu pra carregar suas notas agora. Tenta de novo em instantes.";

export default function NotasPage() {
  const supabase = createClient();
  const { mostrarToast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // null = modal fechado; note = editando; "nova" tratado à parte
  const [notaSelecionada, setNotaSelecionada] = useState<Note | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      mostrarToast(MSG_ERRO_CARREGAR);
      setLoading(false);
      return;
    }

    setNotes((data as Note[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function salvarNota(dados: { title: string; content: string; color: NoteColor }) {
    setSalvando(true);

    if (notaSelecionada) {
      // edição
      const anterior = notaSelecionada;
      const atualizada = { ...notaSelecionada, ...dados, updated_at: new Date().toISOString() };
      setNotes((prev) =>
        prev.map((n) => (n.id === notaSelecionada.id ? atualizada : n))
      );
      const { error } = await supabase
        .from("notes")
        .update({ ...dados, updated_at: new Date().toISOString() })
        .eq("id", notaSelecionada.id);

      if (error) {
        setNotes((prev) => prev.map((n) => (n.id === anterior.id ? anterior : n)));
        mostrarToast(MSG_ERRO_PADRAO);
        setSalvando(false);
        return;
      }
    } else {
      // criação
      const { data: userData, error: erroUsuario } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (erroUsuario || !userId) {
        mostrarToast(MSG_ERRO_PADRAO);
        setSalvando(false);
        return;
      }
      const { error } = await supabase.from("notes").insert({ ...dados, user_id: userId });
      if (error) {
        mostrarToast(MSG_ERRO_PADRAO);
        setSalvando(false);
        return;
      }
      carregar();
    }

    setSalvando(false);
    fecharModal();
  }

  async function excluirNota(id: string) {
    const notaRemovida = notes.find((n) => n.id === id) ?? null;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      if (notaRemovida) setNotes((prev) => [...prev, notaRemovida]);
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }
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
