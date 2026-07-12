"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import SwipeRow from "@/components/SwipeRow";
import type { Workout, WorkoutExercise, WorkoutSession } from "@/types/database";
import DietaView from "@/components/DietaView";


type ExercicioForm = {
  tempId: string;
  name: string;
  sets: string;
  reps: string;
  load: string;
};

function novoExercicioVazio(): ExercicioForm {
  return { tempId: crypto.randomUUID(), name: "", sets: "3", reps: "8-12", load: "" };
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TreinosPage() {
  const supabase = createClient();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exerciciosPorTreino, setExerciciosPorTreino] = useState<Record<string, WorkoutExercise[]>>({});
  const [sessoes, setSessoes] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [formAberto, setFormAberto] = useState<"novo" | string | null>(null);
  const [nomeRotina, setNomeRotina] = useState("");
  const [exerciciosForm, setExerciciosForm] = useState<ExercicioForm[]>([novoExercicioVazio()]);
  const [salvando, setSalvando] = useState(false);

  const [sessaoAtiva, setSessaoAtiva] = useState<{
    workout: Workout;
    exercicios: WorkoutExercise[];
    iniciadoEm: string;
    concluidos: Set<string>;
  } | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: workoutsData } = await supabase
      .from("workouts")
      .select("*")
      .eq("archived", false)
      .order("position", { ascending: true });

    const { data: exerciciosData } = await supabase
      .from("workout_exercises")
      .select("*")
      .order("position", { ascending: true });

    const { data: sessoesData } = await supabase
      .from("workout_sessions")
      .select("*")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(10);

    const mapa: Record<string, WorkoutExercise[]> = {};
    (exerciciosData as WorkoutExercise[] | null)?.forEach((ex) => {
      if (!mapa[ex.workout_id]) mapa[ex.workout_id] = [];
      mapa[ex.workout_id].push(ex);
    });

    setWorkouts((workoutsData as Workout[]) ?? []);
    setExerciciosPorTreino(mapa);
    setSessoes((sessoesData as WorkoutSession[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirNovaRotina() {
    setNomeRotina("");
    setExerciciosForm([novoExercicioVazio()]);
    setFormAberto("novo");
  }

  function abrirEdicaoRotina(workout: Workout) {
    const existentes = exerciciosPorTreino[workout.id] ?? [];
    setNomeRotina(workout.name);
    setExerciciosForm(
      existentes.length > 0
        ? existentes.map((ex) => ({
            tempId: ex.id,
            name: ex.name,
            sets: String(ex.sets),
            reps: ex.reps,
            load: ex.load ?? "",
          }))
        : [novoExercicioVazio()]
    );
    setFormAberto(workout.id);
  }

  function atualizarExercicioForm(tempId: string, campo: keyof ExercicioForm, valor: string) {
    setExerciciosForm((atual) =>
      atual.map((ex) => (ex.tempId === tempId ? { ...ex, [campo]: valor } : ex))
    );
  }

  function adicionarLinhaExercicio() {
    setExerciciosForm((atual) => [...atual, novoExercicioVazio()]);
  }

  function removerLinhaExercicio(tempId: string) {
    setExerciciosForm((atual) =>
      atual.length > 1 ? atual.filter((ex) => ex.tempId !== tempId) : atual
    );
  }

  async function salvarRotina(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeRotina.trim()) return;
    const exerciciosValidos = exerciciosForm.filter((ex) => ex.name.trim());
    if (exerciciosValidos.length === 0) return;

    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    if (formAberto === "novo") {
      const { data: novaRotina } = await supabase
        .from("workouts")
        .insert({ user_id: userId, name: nomeRotina.trim(), position: workouts.length })
        .select()
        .single();

      if (novaRotina) {
        await supabase.from("workout_exercises").insert(
          exerciciosValidos.map((ex, i) => ({
            workout_id: novaRotina.id,
            user_id: userId,
            name: ex.name.trim(),
            sets: Number(ex.sets) || 1,
            reps: ex.reps.trim() || "8-12",
            load: ex.load.trim() || null,
            position: i,
          }))
        );
      }
    } else if (formAberto) {
      const workoutId = formAberto;
      await supabase.from("workouts").update({ name: nomeRotina.trim() }).eq("id", workoutId);
      await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
      await supabase.from("workout_exercises").insert(
        exerciciosValidos.map((ex, i) => ({
          workout_id: workoutId,
          user_id: userId,
          name: ex.name.trim(),
          sets: Number(ex.sets) || 1,
          reps: ex.reps.trim() || "8-12",
          load: ex.load.trim() || null,
          position: i,
        }))
      );
    }

    setFormAberto(null);
    setSalvando(false);
    carregar();
  }

  async function arquivarRotina(workoutId: string) {
    await supabase.from("workouts").update({ archived: true }).eq("id", workoutId);
    carregar();
  }

  function iniciarTreino(workout: Workout) {
    const exercicios = exerciciosPorTreino[workout.id] ?? [];
    setSessaoAtiva({
      workout,
      exercicios,
      iniciadoEm: new Date().toISOString(),
      concluidos: new Set(),
    });
  }

  function alternarExercicioConcluido(exercicioId: string) {
    setSessaoAtiva((atual) => {
      if (!atual) return atual;
      const novo = new Set(atual.concluidos);
      if (novo.has(exercicioId)) novo.delete(exercicioId);
      else novo.add(exercicioId);
      return { ...atual, concluidos: novo };
    });
  }

  async function finalizarTreino() {
    if (!sessaoAtiva) return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    await supabase.from("workout_sessions").insert({
      user_id: userId,
      workout_id: sessaoAtiva.workout.id,
      workout_name: sessaoAtiva.workout.name,
      started_at: sessaoAtiva.iniciadoEm,
      finished_at: new Date().toISOString(),
    });

    setSessaoAtiva(null);
    carregar();
  }

  const totalTreinosSemana = useMemo(() => {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    return sessoes.filter((s) => s.finished_at && new Date(s.finished_at) >= seteDiasAtras).length;
  }, [sessoes]);

  if (sessaoAtiva) {
    const total = sessaoAtiva.exercicios.length;
    const feitos = sessaoAtiva.concluidos.size;
    return (
      <AppShell>
        <div className="mb-6">
          <button
            onClick={() => setSessaoAtiva(null)}
            className="mb-3 text-sm text-ink-faint hover:text-ink"
          >
            ← Sair sem salvar
          </button>
          <h1 className="font-display text-xl font-bold text-ink">{sessaoAtiva.workout.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {feitos}/{total} exercícios concluídos
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-base-border">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: total > 0 ? `${(feitos / total) * 100}%` : "0%" }}
            />
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {sessaoAtiva.exercicios.map((ex) => {
            const concluido = sessaoAtiva.concluidos.has(ex.id);
            return (
              <li
                key={ex.id}
                className="flex items-center justify-between rounded-xl border border-base-border bg-base-surface px-4 py-3.5"
              >
                <div>
                  <p className={`text-sm font-medium ${concluido ? "text-ink-muted line-through" : "text-ink"}`}>
                    {ex.name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {ex.sets}x {ex.reps}
                    {ex.load ? ` · ${ex.load}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => alternarExercicioConcluido(ex.id)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    concluido
                      ? "border-accent bg-accent text-base"
                      : "border-base-border text-ink-faint hover:border-accent hover:text-accent"
                  }`}
                  aria-label="Marcar exercício"
                >
                  {concluido ? "✓" : ""}
                </button>
              </li>
            );
          })}
        </ul>

        <button
          onClick={finalizarTreino}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          Finalizar treino
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Treinos</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {totalTreinosSemana} treino{totalTreinosSemana === 1 ? "" : "s"} nos últimos 7 dias
          </p>
        </div>
        <button
          onClick={abrirNovaRotina}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          + Nova rotina
        </button>
      </div>

      {formAberto && (
        <form
          onSubmit={salvarRotina}
          className="mb-6 flex flex-col gap-3 rounded-xl border border-accent bg-base-surface p-4"
        >
          <input
            value={nomeRotina}
            onChange={(e) => setNomeRotina(e.target.value)}
            placeholder="Nome da rotina, ex: Upper A (Peito e Tríceps)"
            className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />

          <div className="flex flex-col gap-2">
            {exerciciosForm.map((ex) => (
              <div key={ex.tempId} className="flex flex-wrap items-center gap-2 rounded-lg border border-base-border p-2">
                <input
                  value={ex.name}
                  onChange={(e) => atualizarExercicioForm(ex.tempId, "name", e.target.value)}
                  placeholder="Exercício"
                  className="min-w-[140px] flex-1 rounded-md border border-base-border bg-base px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
                />
                <input
                  value={ex.sets}
                  onChange={(e) => atualizarExercicioForm(ex.tempId, "sets", e.target.value)}
                  placeholder="Séries"
                  inputMode="numeric"
                  className="w-16 rounded-md border border-base-border bg-base px-2 py-1.5 text-center text-sm text-ink outline-none focus:border-accent"
                />
                <input
                  value={ex.reps}
                  onChange={(e) => atualizarExercicioForm(ex.tempId, "reps", e.target.value)}
                  placeholder="Reps"
                  className="w-20 rounded-md border border-base-border bg-base px-2 py-1.5 text-center text-sm text-ink outline-none focus:border-accent"
                />
                <input
                  value={ex.load}
                  onChange={(e) => atualizarExercicioForm(ex.tempId, "load", e.target.value)}
                  placeholder="Carga (opcional)"
                  className="w-28 rounded-md border border-base-border bg-base px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => removerLinhaExercicio(ex.tempId)}
                  className="text-ink-faint hover:text-warn"
                  aria-label="Remover exercício"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={adicionarLinhaExercicio}
            className="self-start text-sm font-medium text-accent hover:opacity-80"
          >
            + Adicionar exercício
          </button>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Salvar rotina
            </button>
            <button
              type="button"
              onClick={() => setFormAberto(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-ink-faint hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : workouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-border p-6 text-center">
          <p className="text-sm text-ink-muted">
            Nenhuma rotina ainda. Crie a primeira acima.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {workouts.map((workout) => {
            const exercicios = exerciciosPorTreino[workout.id] ?? [];
            return (
              <li key={workout.id}>
                <SwipeRow onEdit={() => abrirEdicaoRotina(workout)} onDelete={() => arquivarRotina(workout.id)}>
                  <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{workout.name}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-faint">
                        {exercicios.length === 0
                          ? "Sem exercícios"
                          : exercicios.map((e) => e.name).join(", ")}
                      </p>
                    </div>
                    <button
                      onClick={() => iniciarTreino(workout)}
                      disabled={exercicios.length === 0}
                      className="shrink-0 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      Iniciar
                    </button>
                  </div>
                </SwipeRow>
              </li>
            );
          })}
        </ul>
      )}

      {sessoes.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Últimos treinos
          </h2>
          <ul className="flex flex-col gap-1.5">
            {sessoes.slice(0, 5).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-base-border px-3 py-2 text-sm"
              >
                <span className="text-ink">{s.workout_name}</span>
                <span className="text-xs text-ink-faint">
                  {s.finished_at ? formatarDataHora(s.finished_at) : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
