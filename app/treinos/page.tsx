"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import DietaView from "@/components/DietaView";
import type { Workout, WorkoutExercise, WorkoutSession } from "@/types/database";
import { useToast } from "@/components/ToastProvider";

const MSG_ERRO_PADRAO = "Não deu pra salvar agora. Tenta de novo em instantes.";
const MSG_ERRO_CARREGAR = "Alguns dados podem não ter carregado. Puxa a tela pra atualizar.";

type ExercicioForm = {
  tempId: string;
  name: string;
  sets: string;
  reps: string;
  load: string;
};

// Exercício dentro de uma sessão em andamento: começa com os valores
// padrão da rotina (sets/reps/load), mas o usuário pode ajustar durante
// o treino — é isso que vira o registro real salvo no histórico.
type SessaoExercicioState = {
  exerciseId: string;
  name: string;
  sets: string;
  reps: string;
  load: string;
  completed: boolean;
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

// Formata segundos como MM:SS, ou H:MM:SS se passar de 1 hora.
function formatarCronometro(totalSegundos: number): string {
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  const mm = String(minutos).padStart(2, "0");
  const ss = String(segundos).padStart(2, "0");
  return horas > 0 ? `${horas}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function TreinosPage() {
  return (
    <Suspense fallback={null}>
      <TreinosConteudo />
    </Suspense>
  );
}

function TreinosConteudo() {
  const supabase = createClient();
  const { mostrarToast } = useToast();
  const searchParams = useSearchParams();
  const abaInicial = searchParams.get("aba") === "dieta" ? "dieta" : "treinos";
  const [aba, setAba] = useState<"treinos" | "dieta">(abaInicial);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exerciciosPorTreino, setExerciciosPorTreino] = useState<Record<string, WorkoutExercise[]>>({});
  const [sessoes, setSessoes] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [formAberto, setFormAberto] = useState<"novo" | string | null>(null);
  const [nomeRotina, setNomeRotina] = useState("");
  const [exerciciosForm, setExerciciosForm] = useState<ExercicioForm[]>([novoExercicioVazio()]);
  const [salvando, setSalvando] = useState(false);
  const [catalogoExercicios, setCatalogoExercicios] = useState<string[]>([]);
  const [linhaComSugestoes, setLinhaComSugestoes] = useState<string | null>(null);

  const [sessaoAtiva, setSessaoAtiva] = useState<{
    workout: Workout;
    exercicios: SessaoExercicioState[];
    iniciadoEm: string;
  } | null>(null);
  const [finalizando, setFinalizando] = useState(false);

  // Cronômetro ao vivo: recalcula o tempo decorrido a cada segundo
  // enquanto houver uma sessão ativa.
  const [segundosDecorridos, setSegundosDecorridos] = useState(0);
  useEffect(() => {
    if (!sessaoAtiva) return;
    const inicio = new Date(sessaoAtiva.iniciadoEm).getTime();
    setSegundosDecorridos(Math.max(0, Math.floor((Date.now() - inicio) / 1000)));
    const intervalo = setInterval(() => {
      setSegundosDecorridos(Math.max(0, Math.floor((Date.now() - inicio) / 1000)));
    }, 1000);
    return () => clearInterval(intervalo);
  }, [sessaoAtiva?.iniciadoEm]);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    let houveErro = false;

    const { data: workoutsData, error: erroWorkouts } = await supabase
      .from("workouts")
      .select("*")
      .eq("archived", false)
      .order("position", { ascending: true });
    if (erroWorkouts) houveErro = true;

    const { data: exerciciosData, error: erroExercicios } = await supabase
      .from("workout_exercises")
      .select("*")
      .order("position", { ascending: true });
    if (erroExercicios) houveErro = true;

    const { data: sessoesData, error: erroSessoes } = await supabase
      .from("workout_sessions")
      .select("*")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(10);
    if (erroSessoes) houveErro = true;

    const { data: catalogoData, error: erroCatalogo } = await supabase
      .from("exercise_catalog")
      .select("name")
      .order("name", { ascending: true });
    if (erroCatalogo) houveErro = true;

    setCatalogoExercicios(((catalogoData as { name: string }[] | null) ?? []).map((c) => c.name));

    const mapa: Record<string, WorkoutExercise[]> = {};
    (exerciciosData as WorkoutExercise[] | null)?.forEach((ex) => {
      if (!mapa[ex.workout_id]) mapa[ex.workout_id] = [];
      mapa[ex.workout_id].push(ex);
    });

    setWorkouts((workoutsData as Workout[]) ?? []);
    setExerciciosPorTreino(mapa);
    setSessoes((sessoesData as WorkoutSession[]) ?? []);
    setLoading(false);

    if (houveErro) {
      mostrarToast(MSG_ERRO_CARREGAR);
    }
  }, [supabase, mostrarToast]);

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

  function sugestoesPara(texto: string): string[] {
    const alvo = texto.trim().toLowerCase();
    if (!alvo) return [];
    return catalogoExercicios
      .filter((nome) => nome.toLowerCase().includes(alvo))
      .slice(0, 6);
  }

  async function sincronizarCatalogo(nomes: string[]) {
    const novos = Array.from(new Set(nomes.map((n) => n.trim()))).filter(
      (nome) => nome && !catalogoExercicios.some((c) => c.toLowerCase() === nome.toLowerCase())
    );
    for (const nome of novos) {
      const { error } = await supabase.from("exercise_catalog").insert({ name: nome });
      if (!error) {
        setCatalogoExercicios((atual) => [...atual, nome]);
      }
      // Se der erro (ex: outro usuário cadastrou o mesmo nome nesse
      // meio tempo), ignora — o exercício já existe no catálogo de
      // qualquer forma, é só a nossa lista local que ficou desatualizada.
    }
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
    if (!userId) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvando(false);
      return;
    }

    if (formAberto === "novo") {
      const { data: novaRotina, error: erroRotina } = await supabase
        .from("workouts")
        .insert({ user_id: userId, name: nomeRotina.trim(), position: workouts.length })
        .select()
        .single();

      if (erroRotina) {
        mostrarToast(MSG_ERRO_PADRAO);
        setSalvando(false);
        return;
      }

      if (novaRotina) {
        const { error: erroExercicios } = await supabase.from("workout_exercises").insert(
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
        if (erroExercicios) {
          mostrarToast(MSG_ERRO_PADRAO);
          setSalvando(false);
          return;
        }
      }
    } else if (formAberto) {
      const workoutId = formAberto;
      const { error: erroNome } = await supabase
        .from("workouts")
        .update({ name: nomeRotina.trim() })
        .eq("id", workoutId);
      const { error: erroExclusao } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("workout_id", workoutId);
      const { error: erroInsercao } = await supabase.from("workout_exercises").insert(
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

      if (erroNome || erroExclusao || erroInsercao) {
        mostrarToast(MSG_ERRO_PADRAO);
        setSalvando(false);
        carregar(); // recarrega pra refletir o que de fato ficou salvo
        return;
      }
    }

    setFormAberto(null);
    setSalvando(false);
    sincronizarCatalogo(exerciciosValidos.map((ex) => ex.name.trim()));
    carregar();
  }

  async function arquivarRotina(workoutId: string) {
    const { error } = await supabase
      .from("workouts")
      .update({ archived: true })
      .eq("id", workoutId);
    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }
    carregar();
  }

  function iniciarTreino(workout: Workout) {
    const exercicios = exerciciosPorTreino[workout.id] ?? [];
    setSessaoAtiva({
      workout,
      exercicios: exercicios.map((ex) => ({
        exerciseId: ex.id,
        name: ex.name,
        sets: String(ex.sets),
        reps: ex.reps,
        load: ex.load ?? "",
        completed: false,
      })),
      iniciadoEm: new Date().toISOString(),
    });
  }

  function atualizarExercicioSessao(
    exerciseId: string,
    campo: "sets" | "reps" | "load",
    valor: string
  ) {
    setSessaoAtiva((atual) => {
      if (!atual) return atual;
      return {
        ...atual,
        exercicios: atual.exercicios.map((ex) =>
          ex.exerciseId === exerciseId ? { ...ex, [campo]: valor } : ex
        ),
      };
    });
  }

  function alternarExercicioConcluido(exerciseId: string) {
    setSessaoAtiva((atual) => {
      if (!atual) return atual;
      return {
        ...atual,
        exercicios: atual.exercicios.map((ex) =>
          ex.exerciseId === exerciseId ? { ...ex, completed: !ex.completed } : ex
        ),
      };
    });
  }

  async function finalizarTreino() {
    if (!sessaoAtiva) return;
    setFinalizando(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      mostrarToast(MSG_ERRO_PADRAO);
      setFinalizando(false);
      return;
    }

    const finishedAt = new Date().toISOString();
    const duracaoSegundos = Math.max(
      0,
      Math.floor((new Date(finishedAt).getTime() - new Date(sessaoAtiva.iniciadoEm).getTime()) / 1000)
    );

    const { data: sessaoSalva, error: erroSessao } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        workout_id: sessaoAtiva.workout.id,
        workout_name: sessaoAtiva.workout.name,
        started_at: sessaoAtiva.iniciadoEm,
        finished_at: finishedAt,
        duration_seconds: duracaoSegundos,
      })
      .select()
      .single();

    if (erroSessao || !sessaoSalva) {
      mostrarToast(MSG_ERRO_PADRAO);
      setFinalizando(false);
      return;
    }

    const { error: erroItens } = await supabase.from("workout_session_exercises").insert(
      sessaoAtiva.exercicios.map((ex, i) => ({
        session_id: sessaoSalva.id,
        user_id: userId,
        exercise_id: ex.exerciseId,
        name: ex.name,
        sets: Number(ex.sets) || 1,
        reps: ex.reps.trim() || "8-12",
        load: ex.load.trim() || null,
        completed: ex.completed,
        position: i,
      }))
    );

    if (erroItens) {
      // A sessão em si já foi salva — só o detalhe por exercício que falhou.
      // Ainda assim avisamos, porque o histórico vai ficar incompleto.
      mostrarToast(MSG_ERRO_PADRAO);
      setFinalizando(false);
      return;
    }

    mostrarToast("Treino salvo no histórico!", "sucesso");
    setSessaoAtiva(null);
    setFinalizando(false);
    carregar();
  }

  const totalTreinosSemana = useMemo(() => {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    return sessoes.filter((s) => s.finished_at && new Date(s.finished_at) >= seteDiasAtras).length;
  }, [sessoes]);

  if (sessaoAtiva) {
    const total = sessaoAtiva.exercicios.length;
    const feitos = sessaoAtiva.exercicios.filter((ex) => ex.completed).length;
    return (
      <AppShell>
        <div className="mb-6">
          <button
            onClick={() => setSessaoAtiva(null)}
            className="mb-3 text-sm text-ink-faint hover:text-ink"
          >
            ← Sair sem salvar
          </button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-bold text-ink">{sessaoAtiva.workout.name}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {feitos}/{total} exercícios concluídos
              </p>
            </div>
            <div className="shrink-0 rounded-lg border border-base-border bg-base-surface px-3 py-1.5 text-center">
              <p className="font-display text-lg font-bold tabular-nums text-accent">
                {formatarCronometro(segundosDecorridos)}
              </p>
              <p className="text-[10px] text-ink-faint">tempo</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-base-border">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: total > 0 ? `${(feitos / total) * 100}%` : "0%" }}
            />
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {sessaoAtiva.exercicios.map((ex) => {
            return (
              <li
                key={ex.exerciseId}
                className={`rounded-xl border px-4 py-3.5 transition-colors ${
                  ex.completed ? "border-accent/40 bg-accent-dim/30" : "border-base-border bg-base-surface"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-medium ${ex.completed ? "text-ink-muted line-through" : "text-ink"}`}>
                    {ex.name}
                  </p>
                  <button
                    onClick={() => alternarExercicioConcluido(ex.exerciseId)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      ex.completed
                        ? "border-accent bg-accent text-base"
                        : "border-base-border text-ink-faint hover:border-accent hover:text-accent"
                    }`}
                    aria-label="Marcar exercício"
                  >
                    {ex.completed ? "✓" : ""}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    value={ex.sets}
                    onChange={(e) => atualizarExercicioSessao(ex.exerciseId, "sets", e.target.value)}
                    placeholder="Séries"
                    inputMode="numeric"
                    className="w-16 rounded-md border border-base-border bg-base px-2 py-1.5 text-center text-sm text-ink outline-none focus:border-accent"
                  />
                  <input
                    value={ex.reps}
                    onChange={(e) => atualizarExercicioSessao(ex.exerciseId, "reps", e.target.value)}
                    placeholder="Reps"
                    className="w-20 rounded-md border border-base-border bg-base px-2 py-1.5 text-center text-sm text-ink outline-none focus:border-accent"
                  />
                  <input
                    value={ex.load}
                    onChange={(e) => atualizarExercicioSessao(ex.exerciseId, "load", e.target.value)}
                    placeholder="Carga usada"
                    className="w-32 flex-1 rounded-md border border-base-border bg-base px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <button
          onClick={finalizarTreino}
          disabled={finalizando}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {finalizando ? "Salvando..." : "Finalizar treino"}
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Treinos</h1>
          {aba === "treinos" && (
            <p className="mt-1 text-sm text-ink-muted">
              {totalTreinosSemana} treino{totalTreinosSemana === 1 ? "" : "s"} nos últimos 7 dias
            </p>
          )}
        </div>
        {aba === "treinos" && (
          <button
            onClick={abrirNovaRotina}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
          >
            + Nova rotina
          </button>
        )}
      </div>

      <div className="mb-6 flex w-fit rounded-lg border border-base-border p-1">
        <button
          onClick={() => setAba("treinos")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            aba === "treinos" ? "bg-ink text-base" : "text-ink-muted hover:text-ink"
          }`}
        >
          🏋️ Treinos
        </button>
        <button
          onClick={() => setAba("dieta")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            aba === "dieta" ? "bg-ink text-base" : "text-ink-muted hover:text-ink"
          }`}
        >
          🥗 Dieta
        </button>
      </div>

      {aba === "dieta" ? (
        <DietaView />
      ) : (
        <>
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
                    <div className="relative min-w-[140px] flex-1">
                      <input
                        value={ex.name}
                        onChange={(e) => {
                          atualizarExercicioForm(ex.tempId, "name", e.target.value);
                          setLinhaComSugestoes(ex.tempId);
                        }}
                        onFocus={() => setLinhaComSugestoes(ex.tempId)}
                        onBlur={() =>
                          setTimeout(
                            () =>
                              setLinhaComSugestoes((atual) =>
                                atual === ex.tempId ? null : atual
                              ),
                            150
                          )
                        }
                        placeholder="Exercício"
                        autoComplete="off"
                        className="w-full rounded-md border border-base-border bg-base px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
                      />
                      {linhaComSugestoes === ex.tempId &&
                        sugestoesPara(ex.name).length > 0 && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-base-border bg-base-surface shadow-lg">
                            {sugestoesPara(ex.name).map((nome) => (
                              <button
                                key={nome}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  atualizarExercicioForm(ex.tempId, "name", nome);
                                  setLinhaComSugestoes(null);
                                }}
                                className="block w-full truncate px-3 py-1.5 text-left text-sm text-ink hover:bg-base"
                              >
                                {nome}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
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
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-base-border bg-base-surface px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{workout.name}</p>
                        <p className="mt-0.5 truncate text-xs text-ink-faint">
                          {exercicios.length === 0
                            ? "Sem exercícios"
                            : exercicios.map((e) => e.name).join(", ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => abrirEdicaoRotina(workout)}
                          aria-label="Editar rotina"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-base hover:text-ink"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => arquivarRotina(workout.id)}
                          aria-label="Excluir rotina"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-base hover:text-warn"
                        >
                          🗑
                        </button>
                        <button
                          onClick={() => iniciarTreino(workout)}
                          disabled={exercicios.length === 0}
                          className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          Iniciar
                        </button>
                      </div>
                    </div>
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
        </>
      )}
    </AppShell>
  );
}
