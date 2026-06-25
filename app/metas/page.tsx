"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import type { Goal, GoalStatus } from "@/types/database";

const STATUS_LABEL: Record<GoalStatus, string> = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  done: "Concluída",
};

const STATUS_COLOR: Record<GoalStatus, string> = {
  not_started: "#5A6172",
  in_progress: "#F2B84B",
  done: "#2DD4BF",
};

const STATUS_ORDER: GoalStatus[] = ["in_progress", "not_started", "done"];

export default function MetasPage() {
  const supabase = createClient();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false });
    setGoals((data as Goal[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function criarMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    await supabase.from("goals").insert({
      user_id: userId,
      title: titulo.trim(),
      description: descricao.trim() || null,
      deadline: prazo || null,
      status: "not_started",
    });

    setTitulo("");
    setDescricao("");
    setPrazo("");
    setMostrarForm(false);
    setSalvando(false);
    carregar();
  }

  async function mudarStatus(goalId: string, status: GoalStatus) {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, status } : g))
    );
    await supabase.from("goals").update({ status }).eq("id", goalId);
  }

  async function excluirMeta(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    await supabase.from("goals").delete().eq("id", goalId);
  }

  const goalsOrdenadas = [...goals].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <AppShell>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Metas</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Seus objetivos de longo prazo.
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          {mostrarForm ? "Cancelar" : "+ Nova meta"}
        </button>
      </header>

      {mostrarForm && (
        <form
          onSubmit={criarMeta}
          className="mb-6 flex flex-col gap-3 rounded-xl border border-base-border bg-base-surface p-5"
        >
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título da meta, ex: Validar minha primeira ideia de negócio"
            className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição (opcional) — detalhe o que essa meta significa pra você"
            rows={3}
            className="resize-none rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <div className="flex items-center gap-3">
            <label className="text-sm text-ink-muted">Prazo (opcional):</label>
            <input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Salvar meta
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : goalsOrdenadas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
          <p className="text-sm text-ink-muted">
            Você ainda não tem metas cadastradas.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {goalsOrdenadas.map((goal) => (
            <li
              key={goal.id}
              className="group rounded-xl border border-base-border bg-base-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3
                    className={`text-sm font-semibold ${
                      goal.status === "done"
                        ? "text-ink-muted line-through"
                        : "text-ink"
                    }`}
                  >
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="mt-1 text-sm text-ink-muted">
                      {goal.description}
                    </p>
                  )}
                  {goal.deadline && (
                    <p className="mt-2 text-xs text-ink-faint">
                      Prazo: {formatarData(goal.deadline)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => excluirMeta(goal.id)}
                  className="hidden text-xs text-ink-faint transition-colors hover:text-warn group-hover:block"
                >
                  Excluir
                </button>
              </div>

              <div className="mt-3 flex gap-1.5">
                {(["not_started", "in_progress", "done"] as GoalStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => mudarStatus(goal.id, status)}
                      className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                      style={{
                        backgroundColor:
                          goal.status === status
                            ? `${STATUS_COLOR[status]}26`
                            : "transparent",
                        color:
                          goal.status === status
                            ? STATUS_COLOR[status]
                            : "#5A6172",
                        border: `1px solid ${
                          goal.status === status
                            ? STATUS_COLOR[status]
                            : "#1F2530"
                        }`,
                      }}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function formatarData(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
