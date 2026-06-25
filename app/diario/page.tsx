"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import type { JournalEntry, Mood } from "@/types/database";

const MOOD_OPTIONS: { value: Mood; label: string; emoji: string }[] = [
  { value: "great", label: "Ótimo", emoji: "😄" },
  { value: "good", label: "Bom", emoji: "🙂" },
  { value: "neutral", label: "Neutro", emoji: "😐" },
  { value: "hard", label: "Difícil", emoji: "😔" },
];

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DiarioPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [conteudo, setConteudo] = useState("");
  const [moodSelecionado, setMoodSelecionado] = useState<Mood | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [entradaHojeId, setEntradaHojeId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    const lista = (data as JournalEntry[]) ?? [];
    setEntries(lista);

    const entradaHoje = lista.find((e) => e.entry_date === hojeISO());
    if (entradaHoje) {
      setEntradaHojeId(entradaHoje.id);
      setConteudo(entradaHoje.content);
      setMoodSelecionado(entradaHoje.mood);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvarEntrada(e: React.FormEvent) {
    e.preventDefault();
    if (!conteudo.trim()) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    if (entradaHojeId) {
      await supabase
        .from("journal_entries")
        .update({ content: conteudo.trim(), mood: moodSelecionado })
        .eq("id", entradaHojeId);
    } else {
      await supabase.from("journal_entries").insert({
        user_id: userId,
        content: conteudo.trim(),
        mood: moodSelecionado,
        entry_date: hojeISO(),
      });
    }

    setSalvando(false);
    carregar();
  }

  const entradasAnteriores = entries.filter((e) => e.entry_date !== hojeISO());

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Diário</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Um espaço pra refletir sobre o seu dia.
        </p>
      </header>

      <form
        onSubmit={salvarEntrada}
        className="mb-8 flex flex-col gap-4 rounded-xl border border-base-border bg-base-surface p-5"
      >
        <div>
          <p className="mb-2 text-sm text-ink-muted">Como você está hoje?</p>
          <div className="flex gap-2">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMoodSelecionado(opt.value)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg border py-2.5 text-xs transition-colors ${
                  moodSelecionado === opt.value
                    ? "border-accent bg-accent-dim text-accent"
                    : "border-base-border text-ink-muted hover:border-ink-faint"
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="Escreva livremente sobre o seu dia, pensamentos, conquistas ou dificuldades..."
          rows={6}
          className="resize-none rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          required
        />

        <button
          type="submit"
          disabled={salvando}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {entradaHojeId ? "Atualizar entrada de hoje" : "Salvar entrada de hoje"}
        </button>
      </form>

      <h2 className="mb-4 text-sm font-semibold text-ink">Entradas anteriores</h2>

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : entradasAnteriores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-border p-6 text-center">
          <p className="text-sm text-ink-muted">
            Suas próximas entradas vão aparecer aqui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {entradasAnteriores.map((entry) => {
            const moodInfo = MOOD_OPTIONS.find((m) => m.value === entry.mood);
            return (
              <li
                key={entry.id}
                className="rounded-xl border border-base-border bg-base-surface p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-faint">
                    {formatarData(entry.entry_date)}
                  </span>
                  {moodInfo && <span className="text-base">{moodInfo.emoji}</span>}
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink-muted">
                  {entry.content}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function formatarData(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}
