"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import DietaView from "@/components/DietaView";
import type { Workout, WorkoutExercise, WorkoutSession, WorkoutSessionExercise } from "@/types/database";
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
  const [itensPorSessao, setItensPorSessao] = useState<Record<string, WorkoutSessionExercise[]>>({});
  const [loading, setLoading] = useState(true);

  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [filtroRotina, setFiltroRotina] = useState<string>("todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"7" | "30" | "90" | "todos">("30");
  const [sessaoExpandida, setSessaoExpandida] = useState<string | null>(null);
  const [sessaoParaSalvarComoRotina, setSessaoParaSalvarComoRotina] = useState<string | null>(null);
  const [nomeNovaRotinaHistorico, setNomeNovaRotinaHistorico] = useState("");
  const [salvandoNovaRotina, setSalvandoNovaRotina] = useState(false);

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
  const [atualizarRotinaAoFinalizar, setAtualizarRotinaAoFinalizar] = useState(false);

  // Cronômetro ao vivo, com suporte a pausa: enquanto pausado, o tempo
  // acumulado até ali fica congelado (não conta banheiro/descanso longo
  // no tempo total salvo no histórico). totalPausadoMs guarda a soma de
  // todos os intervalos pausados na sessão atual.
  const [segundosDecorridos, setSegundosDecorridos] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [pausaIniciadaEm, setPausaIniciadaEm] = useState<number | null>(null);
  const [totalPausadoMs, setTotalPausadoMs] = useState(0);

  useEffect(() => {
    if (!sessaoAtiva || pausado) return;
    const inicio = new Date(sessaoAtiva.iniciadoEm).getTime();
    const calcular = () => {
      setSegundosDecorridos(Math.max(0, Math.floor((Date.now() - inicio - totalPausadoMs) / 1000)));
    };
    calcular();
    const intervalo = setInterval(calcular, 1000);
    return () => clearInterval(intervalo);
  }, [sessaoAtiva?.iniciadoEm, pausado, totalPausadoMs]);

  function alternarPausaTreino() {
    if (pausado) {
      // Retomando: soma quanto tempo ficou parado ao total pausado da sessão.
      setTotalPausadoMs((atual) => atual + (pausaIniciadaEm !== null ? Date.now() - pausaIniciadaEm : 0));
      setPausaIniciadaEm(null);
      setPausado(false);
    } else {
      setPausaIniciadaEm(Date.now());
      setPausado(true);
    }
  }

  function encerrarSessaoAtiva() {
    setSessaoAtiva(null);
    setSegundosDecorridos(0);
    setPausado(false);
    setPausaIniciadaEm(null);
    setTotalPausadoMs(0);
    setAtualizarRotinaAoFinalizar(false);
  }

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
      .limit(200);
    if (erroSessoes) houveErro = true;

    const idsSessoes = (sessoesData as WorkoutSession[] | null)?.map((s) => s.id) ?? [];
    const { data: itensSessaoData, error: erroItensSessao } = idsSessoes.length
      ? await supabase
          .from("workout_session_exercises")
          .select("*")
          .in("session_id", idsSessoes)
          .order("position", { ascending: true })
      : { data: [] as WorkoutSessionExercise[], error: null };
    if (erroItensSessao) houveErro = true;

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

    const mapaItensSessao: Record<string, WorkoutSessionExercise[]> = {};
    (itensSessaoData as WorkoutSessionExercise[] | null)?.forEach((item) => {
      if (!mapaItensSessao[item.session_id]) mapaItensSessao[item.session_id] = [];
      mapaItensSessao[item.session_id].push(item);
    });

    setWorkouts((workoutsData as Workout[]) ?? []);
    setExerciciosPorTreino(mapa);
    setSessoes((sessoesData as WorkoutSession[]) ?? []);
    setItensPorSessao(mapaItensSessao);
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

  // Cria uma rotina nova a partir do que foi de fato feito em uma sessão
  // do histórico — sem mexer na rotina original (se ainda existir).
  async function criarRotinaAPartirDaSessao(sessionId: string) {
    const nome = nomeNovaRotinaHistorico.trim();
    if (!nome) return;
    const itens = itensPorSessao[sessionId] ?? [];
    if (itens.length === 0) {
      mostrarToast("Essa sessão não tem exercícios salvos pra copiar.");
      return;
    }

    setSalvandoNovaRotina(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvandoNovaRotina(false);
      return;
    }

    const { data: novaRotina, error: erroRotina } = await supabase
      .from("workouts")
      .insert({ user_id: userId, name: nome, position: workouts.length })
      .select()
      .single();

    if (erroRotina || !novaRotina) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvandoNovaRotina(false);
      return;
    }

    const { error: erroExercicios } = await supabase.from("workout_exercises").insert(
      itens.map((item, i) => ({
        workout_id: novaRotina.id,
        user_id: userId,
        name: item.name,
        sets: item.sets,
        reps: item.reps,
        load: item.load,
        position: i,
      }))
    );

    if (erroExercicios) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvandoNovaRotina(false);
      return;
    }

    mostrarToast("Rotina criada a partir do histórico!", "sucesso");
    sincronizarCatalogo(itens.map((item) => item.name));
    setSessaoParaSalvarComoRotina(null);
    setNomeNovaRotinaHistorico("");
    setSalvandoNovaRotina(false);
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
    setSegundosDecorridos(0);
    setPausado(false);
    setPausaIniciadaEm(null);
    setTotalPausadoMs(0);
    setAtualizarRotinaAoFinalizar(false);
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
    // segundosDecorridos já desconta qualquer tempo pausado (e fica
    // congelado corretamente se o usuário finalizar com o cronômetro
    // ainda pausado), então é a fonte de verdade da duração real.
    const duracaoSegundos = segundosDecorridos;

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

    if (atualizarRotinaAoFinalizar) {
      const resultados = await Promise.all(
        sessaoAtiva.exercicios.map((ex) =>
          supabase
            .from("workout_exercises")
            .update({
              sets: Number(ex.sets) || 1,
              reps: ex.reps.trim() || "8-12",
              load: ex.load.trim() || null,
            })
            .eq("id", ex.exerciseId)
        )
      );
      if (resultados.some((r) => r.error)) {
        // Sessão e histórico já estão salvos — só a atualização da rotina
        // que falhou parcialmente, então avisamos sem travar o fluxo.
        mostrarToast("Treino salvo, mas não deu pra atualizar a rotina com as cargas de hoje.");
      }
    }

    mostrarToast(
      atualizarRotinaAoFinalizar ? "Treino salvo e rotina atualizada!" : "Treino salvo no histórico!",
      "sucesso"
    );
    encerrarSessaoAtiva();
    setFinalizando(false);
    carregar();
  }

  const totalTreinosSemana = useMemo(() => {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    return sessoes.filter((s) => s.finished_at && new Date(s.finished_at) >= seteDiasAtras).length;
  }, [sessoes]);

  // Histórico completo: aplica o filtro de rotina e de período por cima
  // das sessões já carregadas (nada de refazer a busca no banco).
  // A "chave" da rotina usa o nome como fallback pra sessões antigas de
  // rotinas que já foram excluídas (workout_id fica null nesse caso).
  const rotinasNoHistorico = useMemo(() => {
    const vistos = new Map<string, string>();
    sessoes.forEach((s) => {
      const chave = s.workout_id ?? s.workout_name;
      if (!vistos.has(chave)) vistos.set(chave, s.workout_name);
    });
    return Array.from(vistos.entries()).map(([chave, nome]) => ({ chave, nome }));
  }, [sessoes]);

  const sessoesFiltradas = useMemo(() => {
    let lista = sessoes;
    if (filtroRotina !== "todas") {
      lista = lista.filter((s) => (s.workout_id ?? s.workout_name) === filtroRotina);
    }
    if (filtroPeriodo !== "todos") {
      const limite = new Date();
      limite.setDate(limite.getDate() - Number(filtroPeriodo));
      lista = lista.filter((s) => s.finished_at && new Date(s.finished_at) >= limite);
    }
    return lista;
  }, [sessoes, filtroRotina, filtroPeriodo]);

  if (sessaoAtiva) {
    const total = sessaoAtiva.exercicios.length;
    const feitos = sessaoAtiva.exercicios.filter((ex) => ex.completed).length;
    return (
      <AppShell>
        <div className="mb-6">
          <button
            onClick={encerrarSessaoAtiva}
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
            <div className="flex shrink-0 items-center gap-2">
              <div
                className={`rounded-lg border px-3 py-1.5 text-center ${
                  pausado ? "border-warn/40 bg-warn-dim" : "border-base-border bg-base-surface"
                }`}
              >
                <p
                  className={`font-display text-lg font-bold tabular-nums ${
                    pausado ? "text-warn" : "text-accent"
                  }`}
                >
                  {formatarCronometro(segundosDecorridos)}
                </p>
                <p className="text-[10px] text-ink-faint">{pausado ? "pausado" : "tempo"}</p>
              </div>
              <button
                onClick={alternarPausaTreino}
                aria-label={pausado ? "Retomar treino" : "Pausar treino"}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm transition-colors ${
                  pausado
                    ? "border-accent bg-accent text-base"
                    : "border-base-border text-ink-faint hover:border-accent hover:text-accent"
                }`}
              >
                {pausado ? "▶" : "⏸"}
              </button>
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

        <label className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={atualizarRotinaAoFinalizar}
            onChange={(e) => setAtualizarRotinaAoFinalizar(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-base-border accent-accent"
          />
          <span>Atualizar a rotina com as cargas/reps de hoje (vira o novo padrão)</span>
        </label>

        <button
          onClick={finalizarTreino}
          disabled={finalizando}
          className="mt-3 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {finalizando ? "Salvando..." : "Finalizar treino"}
        </button>
      </AppShell>
    );
  }

  if (historicoAberto) {
    return (
      <AppShell>
        <div className="mb-4">
          <button
            onClick={() => setHistoricoAberto(false)}
            className="mb-3 text-sm text-ink-faint hover:text-ink"
          >
            ← Voltar
          </button>
          <h1 className="font-display text-xl font-bold text-ink">Histórico de treinos</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {sessoesFiltradas.length} treino{sessoesFiltradas.length === 1 ? "" : "s"} no período
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <select
            value={filtroRotina}
            onChange={(e) => setFiltroRotina(e.target.value)}
            className="rounded-lg border border-base-border bg-base-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="todas">Todas as rotinas</option>
            {rotinasNoHistorico.map((r) => (
              <option key={r.chave} value={r.chave}>
                {r.nome}
              </option>
            ))}
          </select>
          <select
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value as typeof filtroPeriodo)}
            className="rounded-lg border border-base-border bg-base-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="todos">Tudo</option>
          </select>
        </div>

        {sessoesFiltradas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-base-border p-6 text-center">
            <p className="text-sm text-ink-muted">Nenhum treino encontrado nesse filtro.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessoesFiltradas.map((s) => {
              const itens = itensPorSessao[s.id] ?? [];
              const expandida = sessaoExpandida === s.id;
              return (
                <li key={s.id} className="overflow-hidden rounded-xl border border-base-border bg-base-surface">
                  <button
                    onClick={() => setSessaoExpandida(expandida ? null : s.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{s.workout_name}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {s.finished_at ? formatarDataHora(s.finished_at) : ""}
                        {s.duration_seconds != null ? ` · ${formatarCronometro(s.duration_seconds)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-ink-faint">{expandida ? "▲" : "▼"}</span>
                  </button>
                  {expandida && (
                    <div className="border-t border-base-border px-4 py-3">
                      {itens.length === 0 ? (
                        <p className="text-xs text-ink-faint">
                          Sem detalhe de exercícios salvo pra essa sessão.
                        </p>
                      ) : (
                        <>
                          <ul className="flex flex-col gap-1.5">
                            {itens.map((item) => (
                              <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                                <span className={item.completed ? "text-ink" : "text-ink-muted"}>
                                  {item.completed ? "✓ " : ""}
                                  {item.name}
                                </span>
                                <span className="shrink-0 text-xs text-ink-faint">
                                  {item.sets}x {item.reps}
                                  {item.load ? ` · ${item.load}` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>

                          {sessaoParaSalvarComoRotina === s.id ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-base-border pt-3">
                              <input
                                value={nomeNovaRotinaHistorico}
                                onChange={(e) => setNomeNovaRotinaHistorico(e.target.value)}
                                placeholder="Nome da nova rotina"
                                autoFocus
                                className="min-w-[160px] flex-1 rounded-md border border-base-border bg-base px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
                              />
                              <button
                                onClick={() => criarRotinaAPartirDaSessao(s.id)}
                                disabled={salvandoNovaRotina || !nomeNovaRotinaHistorico.trim()}
                                className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-base disabled:opacity-50"
                              >
                                {salvandoNovaRotina ? "Criando..." : "Criar"}
                              </button>
                              <button
                                onClick={() => {
                                  setSessaoParaSalvarComoRotina(null);
                                  setNomeNovaRotinaHistorico("");
                                }}
                                className="text-xs font-medium text-ink-faint hover:text-ink"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSessaoParaSalvarComoRotina(s.id);
                                setNomeNovaRotinaHistorico(`${s.workout_name} (cópia)`);
                              }}
                              className="mt-3 text-xs font-medium text-accent hover:opacity-80"
                            >
                              + Salvar como nova rotina
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
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
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Últimos treinos
                </h2>
                <button
                  onClick={() => setHistoricoAberto(true)}
                  className="text-xs font-medium text-accent hover:opacity-80"
                >
                  Ver histórico completo →
                </button>
              </div>
              <ul className="flex flex-col gap-1.5">
                {sessoes.slice(0, 5).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-base-border px-3 py-2 text-sm"
                  >
                    <span className="text-ink">{s.workout_name}</span>
                    <span className="text-xs text-ink-faint">
                      {s.finished_at ? formatarDataHora(s.finished_at) : ""}
                      {s.duration_seconds != null ? ` · ${formatarCronometro(s.duration_seconds)}` : ""}
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
