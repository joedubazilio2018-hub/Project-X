"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import BotaoNotificacao from "@/components/BotaoNotificacao";
import SwipeRow from "@/components/SwipeRow";
import type { Habit, HabitLog, HabitCategory } from "@/types/database";
import { CORES_CATEGORIA as CORES } from "@/lib/cores";
import { useToast } from "@/components/ToastProvider";

const MSG_ERRO_PADRAO = "Não deu pra salvar agora. Tenta de novo em instantes.";
const MSG_ERRO_CARREGAR = "Alguns dados podem não ter carregado. Puxa a tela pra atualizar.";

function hojeISO(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default function HabitosPage() {
  const supabase = createClient();
  const { mostrarToast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [logsHoje, setLogsHoje] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Form de novo hábito
  const [mostrarFormHabito, setMostrarFormHabito] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaCategoriaId, setNovaCategoriaId] = useState<string>("");
  const [salvando, setSalvando] = useState(false);

  // Edição de hábito existente
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCategoriaId, setEditCategoriaId] = useState<string>("");

  // Form de categoria
  const [mostrarFormCategoria, setMostrarFormCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<string | null>(null);
  const [editCategoriaNome, setEditCategoriaNome] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    let houveErro = false;

    const { data: habitsData, error: habitsError } = await supabase
      .from("habits")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: true });
    if (habitsError) houveErro = true;

    const { data: categoriesData, error: categoriesError } = await supabase
      .from("habit_categories")
      .select("*")
      .order("created_at", { ascending: true });
    if (categoriesError) houveErro = true;

    const { data: logsData, error: logsError } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("date", hojeISO());
    if (logsError) houveErro = true;

    const mapaLogs: Record<string, boolean> = {};
    (logsData as HabitLog[] | null)?.forEach((log) => {
      mapaLogs[log.habit_id] = log.done;
    });

    setHabits((habitsData as Habit[]) ?? []);
    setCategories((categoriesData as HabitCategory[]) ?? []);
    setLogsHoje(mapaLogs);
    setLoading(false);

    if (houveErro) {
      mostrarToast(MSG_ERRO_CARREGAR);
    }
  }, [supabase, mostrarToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ── Hábitos ──
  async function criarHabito(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvando(false);
      return;
    }

    const cat = categories.find((c) => c.id === novaCategoriaId);

    const { error } = await supabase.from("habits").insert({
      user_id: userId,
      name: novoNome.trim(),
      category_id: novaCategoriaId || null,
      color: cat?.color ?? CORES[0],
      frequency: "daily",
    });

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvando(false);
      return;
    }

    setNovoNome("");
    setNovaCategoriaId("");
    setMostrarFormHabito(false);
    setSalvando(false);
    carregar();
  }

  function iniciarEdicaoHabito(habit: Habit) {
    setEditandoId(habit.id);
    setEditNome(habit.name);
    setEditCategoriaId(habit.category_id ?? "");
  }

  async function salvarEdicaoHabito(habitId: string) {
    if (!editNome.trim()) return;
    const cat = categories.find((c) => c.id === editCategoriaId);

    const { error } = await supabase
      .from("habits")
      .update({
        name: editNome.trim(),
        category_id: editCategoriaId || null,
        color: cat?.color ?? CORES[0],
      })
      .eq("id", habitId);

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }

    setEditandoId(null);
    carregar();
  }

  async function alternarCheckin(habitId: string) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }

    const feitoAnterior = !!logsHoje[habitId];
    const feitoAgora = !feitoAnterior;
    setLogsHoje((prev) => ({ ...prev, [habitId]: feitoAgora }));

    const { error } = await supabase
      .from("habit_logs")
      .upsert(
        {
          habit_id: habitId,
          user_id: userId,
          date: hojeISO(),
          done: feitoAgora,
        },
        { onConflict: "habit_id,date" }
      );

    if (error) {
      setLogsHoje((prev) => ({ ...prev, [habitId]: feitoAnterior }));
      mostrarToast(MSG_ERRO_PADRAO);
    }
  }

  async function arquivarHabito(habitId: string) {
    const { error } = await supabase
      .from("habits")
      .update({ archived: true })
      .eq("id", habitId);

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }
    carregar();
  }

  // ── Categorias ──
  async function criarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!novaCategoriaNome.trim()) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvando(false);
      return;
    }

    const cor = CORES[categories.length % CORES.length];

    const { error } = await supabase.from("habit_categories").insert({
      user_id: userId,
      name: novaCategoriaNome.trim(),
      color: cor,
    });

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvando(false);
      return;
    }

    setNovaCategoriaNome("");
    setMostrarFormCategoria(false);
    setSalvando(false);
    carregar();
  }

  function iniciarEdicaoCategoria(cat: HabitCategory) {
    setEditandoCategoriaId(cat.id);
    setEditCategoriaNome(cat.name);
  }

  async function salvarEdicaoCategoria(categoriaId: string) {
    if (!editCategoriaNome.trim()) return;
    const { error } = await supabase
      .from("habit_categories")
      .update({ name: editCategoriaNome.trim() })
      .eq("id", categoriaId);

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }
    setEditandoCategoriaId(null);
    carregar();
  }

  async function excluirCategoria(categoriaId: string) {
    const { error } = await supabase.from("habit_categories").delete().eq("id", categoriaId);
    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }
    carregar();
  }

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Hábitos</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Marque o que você cumpriu hoje.
        </p>
        <div className="mt-3">
          <BotaoNotificacao />
        </div>
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
              placeholder="Ex: Saúde, Estudos, Trabalho"
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

      {/* Novo hábito */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Seus hábitos</h2>
        <button
          onClick={() => setMostrarFormHabito((v) => !v)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          {mostrarFormHabito ? "Cancelar" : "+ Novo hábito"}
        </button>
      </div>

      {mostrarFormHabito && (
        <form
          onSubmit={criarHabito}
          className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-base-border bg-base-surface p-4"
        >
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Novo hábito, ex: Ler 20 minutos"
            className="min-w-[200px] flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />
          <select
            value={novaCategoriaId}
            onChange={(e) => setNovaCategoriaId(e.target.value)}
            className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            <option value="">Sem categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Adicionar
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : habits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
          <p className="text-sm text-ink-muted">
            Você ainda não tem hábitos. Adicione o primeiro acima.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.map((habit) => {
            const feito = !!logsHoje[habit.id];
            const cat = categories.find((c) => c.id === habit.category_id);

            if (editandoId === habit.id) {
              return (
                <li
                  key={habit.id}
                  className="flex items-center gap-3 rounded-xl border border-accent bg-base-surface px-4 py-3.5"
                >
                  <input
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    autoFocus
                    className="flex-1 rounded-lg border border-base-border bg-base px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
                  />
                  <select
                    value={editCategoriaId}
                    onChange={(e) => setEditCategoriaId(e.target.value)}
                    className="rounded-lg border border-base-border bg-base px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => salvarEdicaoHabito(habit.id)}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-base"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    className="text-xs text-ink-faint hover:text-ink"
                  >
                    Cancelar
                  </button>
                </li>
              );
            }

            return (
              <li key={habit.id}>
                <SwipeRow
                  onEdit={() => iniciarEdicaoHabito(habit)}
                  onDelete={() => arquivarHabito(habit.id)}
                >
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat?.color ?? habit.color }}
                      />
                      <div>
                        <span
                          className={`text-sm font-medium ${
                            feito ? "text-ink-muted line-through" : "text-ink"
                          }`}
                        >
                          {habit.name}
                        </span>
                        {cat && (
                          <span className="ml-2 text-xs text-ink-faint">
                            {cat.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => alternarCheckin(habit.id)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                        feito
                          ? "border-accent bg-accent text-base"
                          : "border-base-border text-ink-faint hover:border-accent hover:text-accent"
                      }`}
                      aria-label={feito ? "Desmarcar" : "Marcar como feito"}
                    >
                      {feito ? "✓" : ""}
                    </button>
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
