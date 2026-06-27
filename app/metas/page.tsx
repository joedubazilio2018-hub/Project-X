"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import SwipeRow from "@/components/SwipeRow";
import type { Goal, GoalStatus, GoalCategory } from "@/types/database";

const CORES = ["#2DD4BF", "#F2B84B", "#FB7185", "#60A5FA", "#A78BFA", "#34D399"];

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
  const [categories, setCategories] = useState<GoalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Form de nova meta
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [categoriaId, setCategoriaId] = useState("");

  // Edição de meta existente
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editPrazo, setEditPrazo] = useState("");
  const [editCategoriaId, setEditCategoriaId] = useState("");

  // Form de categoria
  const [mostrarFormCategoria, setMostrarFormCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<string | null>(null);
  const [editCategoriaNome, setEditCategoriaNome] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: cats } = await supabase
      .from("goal_categories")
      .select("*")
      .order("created_at", { ascending: true });

    setGoals((data as Goal[]) ?? []);
    setCategories((cats as GoalCategory[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ── Metas ──
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
      category_id: categoriaId || null,
      status: "not_started",
    });

    setTitulo("");
    setDescricao("");
    setPrazo("");
    setCategoriaId("");
    setMostrarForm(false);
    setSalvando(false);
    carregar();
  }

  function iniciarEdicao(goal: Goal) {
    setEditandoId(goal.id);
    setEditTitulo(goal.title);
    setEditDescricao(goal.description ?? "");
    setEditPrazo(goal.deadline ?? "");
    setEditCategoriaId(goal.category_id ?? "");
  }

  async function salvarEdicao(goalId: string) {
    if (!editTitulo.trim()) return;

    await supabase
      .from("goals")
      .update({
        title: editTitulo.trim(),
        description: editDescricao.trim() || null,
        deadline: editPrazo || null,
        category_id: editCategoriaId || null,
      })
      .eq("id", goalId);

    setEditandoId(null);
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

  // ── Categorias ──
  async function criarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!novaCategoriaNome.trim()) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const cor = CORES[categories.length % CORES.length];

    await supabase.from("goal_categories").insert({
      user_id: userId,
      name: novaCategoriaNome.trim(),
      color: cor,
    });

    setNovaCategoriaNome("");
    setMostrarFormCategoria(false);
    setSalvando(false);
    carregar();
  }

  function iniciarEdicaoCategoria(cat: GoalCategory) {
    setEditandoCategoriaId(cat.id);
    setEditCategoriaNome(cat.name);
  }

  async function salvarEdicaoCategoria(categoriaId: string) {
    if (!editCategoriaNome.trim()) return;
    await supabase
      .from("goal_categories")
      .update({ name: editCategoriaNome.trim() })
      .eq("id", categoriaId);
    setEditandoCategoriaId(null);
    carregar();
  }

  async function excluirCategoria(categoriaId: string) {
    await supabase.from("goal_categories").delete().eq("id", categoriaId);
    carregar();
  }

  const goalsOrdenadas = [...goals].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Metas</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Seus objetivos de longo prazo.
        </p>
      </header>

      {/* Categorias */}
      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Categorias</h2>
          <button
            onClick={() => setMostrarFormCategoria((v) => !v)}
            className="text-xs font-medium text-accent hover:underline"
          >
            {mostrarFormCategoria ? "Cancelar" : "+ Nova categoria"}
          </button>
        </div>

        {mostrarFormCategoria && (
          <form
            onSubmit={criarCategoria}
            className="mb-3 flex items-center gap-3 rounded-xl border border-base-border bg-base-surface p-4"
          >
            <input
              value={novaCategoriaNome}
              onChange={(e) => setNovaCategoriaNome(e.target.value)}
              placeholder="Ex: Carreira, Pessoal, Financeiro"
              className="flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Salvar
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) =>
            editandoCategoriaId === cat.id ? (
              <div
                key={cat.id}
                className="flex items-center gap-1.5 rounded-full border border-accent bg-base-surface px-2 py-1"
              >
                <input
                  value={editCategoriaNome}
                  onChange={(e) => setEditCategoriaNome(e.target.value)}
                  autoFocus
                  className="w-28 bg-transparent text-xs text-ink outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") salvarEdicaoCategoria(cat.id);
                    if (e.key === "Escape") setEditandoCategoriaId(null);
                  }}
                />
                <button
                  onClick={() => salvarEdicaoCategoria(cat.id)}
                  className="text-xs text-accent"
                >
                  ✓
                </button>
                <button
                  onClick={() => setEditandoCategoriaId(null)}
                  className="text-xs text-ink-faint"
                >
                  ×
                </button>
              </div>
            ) : (
              <span
                key={cat.id}
                className="group flex items-center gap-1.5 rounded-full border border-base-border px-3 py-1.5 text-xs text-ink"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
                <button
                  onClick={() => iniciarEdicaoCategoria(cat)}
                  className="hidden text-ink-faint hover:text-accent group-hover:inline"
                >
                  editar
                </button>
                <button
                  onClick={() => excluirCategoria(cat.id)}
                  className="hidden text-ink-faint hover:text-warn group-hover:inline"
                >
                  ×
                </button>
              </span>
            )
          )}
          {categories.length === 0 && (
            <p className="text-sm text-ink-muted">Nenhuma categoria ainda.</p>
          )}
        </div>
      </section>

      {/* Nova meta */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Suas metas</h2>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          {mostrarForm ? "Cancelar" : "+ Nova meta"}
        </button>
      </div>

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
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-ink-muted">Prazo (opcional):</label>
            <input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
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
          {goalsOrdenadas.map((goal) => {
            const cat = categories.find((c) => c.id === goal.category_id);

            if (editandoId === goal.id) {
              return (
                <li
                  key={goal.id}
                  className="rounded-xl border border-accent bg-base-surface p-4"
                >
                  <div className="flex flex-col gap-3">
                    <input
                      value={editTitulo}
                      onChange={(e) => setEditTitulo(e.target.value)}
                      autoFocus
                      className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                    <textarea
                      value={editDescricao}
                      onChange={(e) => setEditDescricao(e.target.value)}
                      rows={2}
                      placeholder="Descrição (opcional)"
                      className="resize-none rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="date"
                        value={editPrazo}
                        onChange={(e) => setEditPrazo(e.target.value)}
                        className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                      />
                      <select
                        value={editCategoriaId}
                        onChange={(e) => setEditCategoriaId(e.target.value)}
                        className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                      >
                        <option value="">Sem categoria</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => salvarEdicao(goal.id)}
                        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="text-sm text-ink-faint hover:text-ink"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </li>
              );
            }

            return (
              <li key={goal.id}>
                <SwipeRow
                  onEdit={() => iniciarEdicao(goal)}
                  onDelete={() => excluirMeta(goal.id)}
                >
                  <div className="p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {cat && (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                        <h3
                          className={`text-sm font-semibold ${
                            goal.status === "done"
                              ? "text-ink-muted line-through"
                              : "text-ink"
                          }`}
                        >
                          {goal.title}
                        </h3>
                      </div>
                      {cat && (
                        <p className="mt-1 text-xs text-ink-faint">{cat.name}</p>
                      )}
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
                  </div>
                </SwipeRow>
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
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
