"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";
import GreetingHeader from "@/components/painel/GreetingHeader";
import QuoteCard from "@/components/painel/QuoteCard";
import TodayProgress from "@/components/painel/TodayProgress";
import QuickSummaryGrid from "@/components/painel/QuickSummaryGrid";
import UpcomingDeadlines from "@/components/painel/UpcomingDeadlines";
import type {
  Habit,
  HabitLog,
  Task,
  Workout,
  WorkoutSession,
  WaterLog,
  Transaction,
  JournalEntry,
  Goal,
} from "@/types/database";

const MSG_ERRO_CARREGAR =
  "Alguns dados podem não ter carregado corretamente. Puxe pra atualizar ou volte mais tarde.";

// Verifica a cada 5 minutos se o dia/mês virou enquanto o app fica aberto,
// pra recalcular "hoje" e o resumo financeiro do mês sem precisar de reload.
const INTERVALO_REVALIDACAO_MS = 5 * 60 * 1000;

function paraISOLocal(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function hojeISO(): string {
  return paraISOLocal(new Date());
}

function inicioDaSemanaISO(): string {
  const d = new Date();
  const diaSemana = d.getDay(); // 0 = domingo
  d.setDate(d.getDate() - diaSemana);
  d.setHours(0, 0, 0, 0);
  return paraISOLocal(d);
}

function diasNoMesAtual(): number {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
}

export default function DashboardPage() {
  const supabase = createClient();
  const { mostrarToast } = useToast();

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logsHoje, setLogsHoje] = useState<HabitLog[]>([]);
  const [tarefas, setTarefas] = useState<Task[]>([]);
  const [treinosAtivos, setTreinosAtivos] = useState<Workout[]>([]);
  const [sessoesSemana, setSessoesSemana] = useState<WorkoutSession[]>([]);
  const [aguaHoje, setAguaHoje] = useState<WaterLog | null>(null);
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [diarioMes, setDiarioMes] = useState<JournalEntry[]>([]);
  const [metas, setMetas] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // "Relógio" leve só pra forçar recalcular data/mês em sessões longas
  const [, forcarRevalidacao] = useState(0);

  const carregar = useCallback(async () => {
    setLoading(true);
    let houveErro = false;

    const { data: userData } = await supabase.auth.getUser();
    const nomeSalvo = userData.user?.user_metadata?.nome as string | undefined;
    if (nomeSalvo) {
      setNomeUsuario(nomeSalvo.split(" ")[0]);
    } else if (userData.user?.email) {
      setNomeUsuario(userData.user.email.split("@")[0]);
    }

    const hoje = hojeISO();
    const inicioSemana = inicioDaSemanaISO();
    const inicioMes = `${hoje.slice(0, 7)}-01`;

    const [
      { data: habitsData, error: erroHabits },
      { data: logsData, error: erroLogs },
      { data: tarefasData, error: erroTarefas },
      { data: treinosData, error: erroTreinos },
      { data: sessoesData, error: erroSessoes },
      { data: aguaData, error: erroAgua },
      { data: transacoesData, error: erroTransacoes },
      { data: diarioData, error: erroDiario },
      { data: metasData, error: erroMetas },
    ] = await Promise.all([
      supabase.from("habits").select("*").eq("archived", false),
      supabase.from("habit_logs").select("*").eq("date", hoje),
      supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("workouts").select("*").eq("archived", false),
      supabase
        .from("workout_sessions")
        .select("*")
        .not("finished_at", "is", null)
        .gte("finished_at", inicioSemana),
      supabase.from("water_logs").select("*").eq("date", hoje).maybeSingle(),
      supabase.from("transactions").select("*"),
      supabase
        .from("journal_entries")
        .select("*")
        .gte("entry_date", inicioMes),
      supabase.from("goals").select("*"),
    ]);

    if (erroHabits) houveErro = true;
    if (erroLogs) houveErro = true;
    if (erroTarefas) houveErro = true;
    if (erroTreinos) houveErro = true;
    if (erroSessoes) houveErro = true;
    if (erroAgua) houveErro = true;
    if (erroTransacoes) houveErro = true;
    if (erroDiario) houveErro = true;
    if (erroMetas) houveErro = true;

    if (houveErro) mostrarToast(MSG_ERRO_CARREGAR);

    setHabits((habitsData as Habit[]) ?? []);
    setLogsHoje((logsData as HabitLog[]) ?? []);
    setTarefas((tarefasData as Task[]) ?? []);
    setTreinosAtivos((treinosData as Workout[]) ?? []);
    setSessoesSemana((sessoesData as WorkoutSession[]) ?? []);
    setAguaHoje((aguaData as WaterLog) ?? null);
    setTransacoes((transacoesData as Transaction[]) ?? []);
    setDiarioMes((diarioData as JournalEntry[]) ?? []);
    setMetas((metasData as Goal[]) ?? []);
    setLoading(false);
  }, [supabase, mostrarToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Revalida periodicamente (e quando a aba volta a ficar ativa) pra pegar a
  // virada do dia/mês em sessões que ficam abertas — é o que garante que o
  // resumo financeiro do "Resumo rápido" atualize sozinho quando o mês vira.
  const ultimoMesRef = useRef(hojeISO().slice(0, 7));
  useEffect(() => {
    function revalidarSeNecessario() {
      const mesAgora = hojeISO().slice(0, 7);
      forcarRevalidacao((n) => n + 1);
      if (mesAgora !== ultimoMesRef.current) {
        ultimoMesRef.current = mesAgora;
        carregar();
      }
    }
    const intervalo = setInterval(revalidarSeNecessario, INTERVALO_REVALIDACAO_MS);
    document.addEventListener("visibilitychange", revalidarSeNecessario);
    window.addEventListener("focus", revalidarSeNecessario);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", revalidarSeNecessario);
      window.removeEventListener("focus", revalidarSeNecessario);
    };
  }, [carregar]);

  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);

  const metricasHoje = useMemo(() => {
    const habitosFeitos = logsHoje.filter((l) => l.done).length;
    const habitosTotal = habits.length;

    const tarefasDeHoje = tarefas.filter((t) => t.due_date === hoje);
    const tarefasFeitas = tarefasDeHoje.filter((t) => t.done).length;
    const tarefasTotal = tarefasDeHoje.length;

    const treinosFeitos = new Set(sessoesSemana.map((s) => s.workout_id ?? s.id)).size;
    const treinosMeta = treinosAtivos.length;

    return {
      habitosFeitos,
      habitosTotal,
      tarefasFeitas,
      tarefasTotal,
      treinosFeitos,
      treinosMeta,
      aguaMl: aguaHoje?.ml ?? 0,
      aguaMetaMl: aguaHoje?.goal_ml ?? 2000,
    };
  }, [logsHoje, habits, tarefas, hoje, sessoesSemana, treinosAtivos, aguaHoje]);

  const resumoRapido = useMemo(() => {
    const receitaMes = transacoes
      .filter((t) => t.type === "income" && t.date.startsWith(mesAtual))
      .reduce((acc, t) => acc + t.amount, 0);
    const despesaMes = transacoes
      .filter((t) => t.type === "expense" && t.date.startsWith(mesAtual))
      .reduce((acc, t) => acc + t.amount, 0);
    const guardado = metas.reduce((acc, g) => acc + (g.current_amount ?? 0), 0);

    return {
      receitaMes,
      despesaMes,
      guardado,
      aguaMl: aguaHoje?.ml ?? 0,
      aguaMetaMl: aguaHoje?.goal_ml ?? 2000,
      diasEscritos: new Set(diarioMes.map((j) => j.entry_date)).size,
      diasNoMes: diasNoMesAtual(),
    };
  }, [transacoes, mesAtual, aguaHoje, diarioMes, metas]);

  return (
    <AppShell>
      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-ink-muted">Carregando...</p>
        </div>
      ) : (
        <>
          <GreetingHeader nome={nomeUsuario} />
          <QuoteCard />
          <TodayProgress metricas={metricasHoje} />
          <QuickSummaryGrid dados={resumoRapido} />
          <UpcomingDeadlines tarefas={tarefas} />
        </>
      )}
    </AppShell>
  );
}
