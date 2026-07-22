"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase-browser";
import { frasedoDia } from "@/lib/frase-do-dia";
import AppShell from "@/components/AppShell";
import CompartilharFrase from "@/components/CompartilharFrase";
import AguaCard from "@/components/AguaCard";
import { useToast } from "@/components/ToastProvider";
import { calcularTDEE, calcularKcal } from "@/lib/nutricao";
import type {
  Habit,
  HabitLog,
  Goal,
  JournalEntry,
  Transaction,
  Category,
  Mood,
  Task,
  Workout,
  WorkoutSession,
  BodyMetrics,
  MealItem,
} from "@/types/database";

type EventoTimeline = {
  data: string; // YYYY-MM-DD, usado para ordenar
  criadoEm: string; // timestamp completo, usado para ordenar dentro do mesmo dia
  tipo: "habito" | "meta" | "diario" | "financa";
  texto: string;
  cor: string;
};

function paraISOLocal(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function hojeISO(): string {
  return paraISOLocal(new Date());
}

function ultimosNDias(n: number): string[] {
  const dias: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(paraISOLocal(d));
  }
  return dias;
}

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const DIAS_CALENDARIO = 90;
const MSG_ERRO_CARREGAR = "Alguns dados podem não ter carregado corretamente. Puxe pra atualizar ou volte mais tarde.";

export default function DashboardPage() {
  const supabase = createClient();
  const { mostrarToast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs90dias, setLogs90dias] = useState<HabitLog[]>([]);
  const [goalsRecentes, setGoalsRecentes] = useState<Goal[]>([]);
  const [diarioRecente, setDiarioRecente] = useState<JournalEntry[]>([]);
  const [transacoesRecentes, setTransacoesRecentes] = useState<Transaction[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [tarefas, setTarefas] = useState<Task[]>([]);
  const [treinosAtivos, setTreinosAtivos] = useState<Workout[]>([]);
  const [sessoesTreino, setSessoesTreino] = useState<WorkoutSession[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);
  const [itensDietaHoje, setItensDietaHoje] = useState<MealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const nomeSalvo = userData.user?.user_metadata?.nome as string | undefined;
    if (nomeSalvo) {
      setNomeUsuario(nomeSalvo.split(" ")[0]);
    } else if (userData.user?.email) {
      setNomeUsuario(userData.user.email.split("@")[0]);
    }

    const dias = ultimosNDias(DIAS_CALENDARIO);
    let houveErro = false;

    const { data: habitsData, error: erroHabits } = await supabase
      .from("habits")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: true });
    if (erroHabits) houveErro = true;

    const { data: logsData, error: erroLogs } = await supabase
      .from("habit_logs")
      .select("*")
      .gte("date", dias[0])
      .lte("date", dias[dias.length - 1]);
    if (erroLogs) houveErro = true;

    const { data: goalsData, error: erroGoals } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false });
    if (erroGoals) houveErro = true;

    const dias30 = ultimosNDias(30);
    const { data: diarioData, error: erroDiario } = await supabase
      .from("journal_entries")
      .select("*")
      .gte("entry_date", dias30[0])
      .order("created_at", { ascending: false });
    if (erroDiario) houveErro = true;

    const { data: transacoesData, error: erroTransacoes } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });
    if (erroTransacoes) houveErro = true;

    const { data: categoriasData, error: erroCategorias } = await supabase
      .from("categories")
      .select("*");
    if (erroCategorias) houveErro = true;

    const { data: tarefasData, error: erroTarefas } = await supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (erroTarefas) houveErro = true;

    const { data: treinosData, error: erroTreinos } = await supabase
      .from("workouts")
      .select("*")
      .eq("archived", false);
    if (erroTreinos) houveErro = true;

    const { data: sessoesData, error: erroSessoes } = await supabase
      .from("workout_sessions")
      .select("*")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(10);
    if (erroSessoes) houveErro = true;

    const hojeCarregar = hojeISO();
    const userId = userData.user?.id;

    const { data: metricsData, error: erroMetrics } = await supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", userId ?? "")
      .maybeSingle();
    if (erroMetrics) houveErro = true;

    const { data: refeicoesHojeData, error: erroRefeicoes } = await supabase
      .from("meals")
      .select("*")
      .eq("date", hojeCarregar);
    if (erroRefeicoes) houveErro = true;

    const idsRefeicoesHoje = (refeicoesHojeData ?? []).map((m) => m.id as string);
    let itensDietaData: MealItem[] = [];
    if (idsRefeicoesHoje.length > 0) {
      const { data, error: erroItensDieta } = await supabase
        .from("meal_items")
        .select("*")
        .in("meal_id", idsRefeicoesHoje);
      if (erroItensDieta) houveErro = true;
      itensDietaData = (data as MealItem[]) ?? [];
    }

    if (houveErro) {
      mostrarToast(MSG_ERRO_CARREGAR);
    }

    setHabits((habitsData as Habit[]) ?? []);
    setLogs90dias((logsData as HabitLog[]) ?? []);
    setGoalsRecentes((goalsData as Goal[]) ?? []);
    setDiarioRecente((diarioData as JournalEntry[]) ?? []);
    setTransacoesRecentes((transacoesData as Transaction[]) ?? []);
    setCategorias((categoriasData as Category[]) ?? []);
    setTarefas((tarefasData as Task[]) ?? []);
    setTreinosAtivos((treinosData as Workout[]) ?? []);
    setSessoesTreino((sessoesData as WorkoutSession[]) ?? []);
    setBodyMetrics((metricsData as BodyMetrics) ?? null);
    setItensDietaHoje(itensDietaData);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const dias90 = ultimosNDias(DIAS_CALENDARIO);
  const dias7 = dias90.slice(-7);
  const hoje = hojeISO();

  // Combina hábitos, metas e tarefas num único "score do dia" (0-100),
  // usado no card de hoje, no gráfico "Últimos 7 dias" e na "Constância".
  // Hábitos valem até 55 pontos (proporcional ao % concluído no dia).
  // Metas valem até 40 pontos: concluída = 15 pts (máx 2 = 30);
  // criada/movida = 5 pts (máx 2 = 10).
  // Tarefas valem até 15 pontos: cada uma concluída = 7 pts (máx ~2).
  function calcularScoreDoDia(dia: string) {
    const feitosHabitos = logs90dias.filter((l) => l.date === dia && l.done).length;
    const totalHabitos = habits.length;

    const metasConcluidas = goalsRecentes.filter(
      (g) => g.status === "done" && g.status_changed_at.slice(0, 10) === dia
    ).length;
    const metasMovimentadas = goalsRecentes.filter(
      (g) => g.status !== "done" && g.status_changed_at.slice(0, 10) === dia
    ).length;

    const tarefasConcluidas = tarefas.filter(
      (t) => t.done && t.completed_at?.slice(0, 10) === dia
    ).length;

    const pontosHabitos = totalHabitos > 0 ? (feitosHabitos / totalHabitos) * 55 : null;
    const pontosMetas = Math.min(metasConcluidas * 15, 30) + Math.min(metasMovimentadas * 5, 10);
    const pontosTarefas = Math.min(tarefasConcluidas * 7, 15);

    const temAtividade =
      pontosHabitos !== null || metasConcluidas > 0 || metasMovimentadas > 0 || tarefasConcluidas > 0;

    const score = temAtividade
      ? Math.min(Math.round((pontosHabitos ?? 0) + pontosMetas + pontosTarefas), 100)
      : null;

    return {
      dia,
      score,
      feitosHabitos,
      totalHabitos,
      metasConcluidas,
      metasMovimentadas,
      tarefasConcluidas,
    };
  }

  const atividadePorDia7 = dias7.map((dia) => calcularScoreDoDia(dia));

  const feitosHoje = logs90dias.filter((l) => l.date === hoje && l.done).length;
  const totalHoje = habits.length;

  function calcularStreak(): number {
    let streak = 0;
    const datasComLog = new Set(
      logs90dias.filter((l) => l.done).map((l) => l.date)
    );
    let cursor = new Date();
    while (true) {
      const iso = paraISOLocal(cursor);
      if (datasComLog.has(iso)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  const streak = calcularStreak();

  // ── Score Diário ──
  // Usa a mesma fórmula de calcularScoreDoDia (hábitos + metas + tarefas),
  // compartilhada com os gráficos "Últimos 7 dias" e "Constância" abaixo.
  const scoreHoje = calcularScoreDoDia(hoje);
  const scoreDiario = scoreHoje.score;
  const temAtividadeHoje = scoreDiario !== null;

  function corDoScore(score: number | null): string {
    if (score === null) return "#57575B";
    if (score >= 80) return "#E8541E";
    if (score >= 50) return "#D9A448";
    if (score >= 20) return "#9C9CA0";
    return "#57575B";
  }

  function explicacaoDoScore(): string {
    if (!temAtividadeHoje) {
      return "Cadastre hábitos, avance uma meta ou conclua uma tarefa para começar a pontuar hoje.";
    }

    const partes: string[] = [];

    if (scoreHoje.totalHabitos > 0) {
      partes.push(`${scoreHoje.feitosHabitos} de ${scoreHoje.totalHabitos} hábitos concluídos`);
    }
    if (scoreHoje.metasConcluidas > 0) {
      partes.push(
        `${scoreHoje.metasConcluidas} ${scoreHoje.metasConcluidas === 1 ? "meta concluída" : "metas concluídas"}`
      );
    }
    if (scoreHoje.metasMovimentadas > 0) {
      partes.push(
        `${scoreHoje.metasMovimentadas} ${scoreHoje.metasMovimentadas === 1 ? "meta avançou" : "metas avançaram"}`
      );
    }
    if (scoreHoje.tarefasConcluidas > 0) {
      partes.push(
        `${scoreHoje.tarefasConcluidas} ${scoreHoje.tarefasConcluidas === 1 ? "tarefa concluída" : "tarefas concluídas"}`
      );
    }

    const resumo = partes.join(", ");

    if (scoreDiario !== null && scoreDiario >= 80) return `Excelente ritmo. ${resumo}.`;
    if (scoreDiario !== null && scoreDiario >= 50) return `Bom ritmo. ${resumo}.`;
    if (scoreDiario !== null && scoreDiario >= 20) return `Ritmo regular. ${resumo}.`;
    return `Ainda dá tempo de melhorar hoje. ${resumo}.`;
  }

  // Monta os dados do calendário de constância (90 dias, intensidade pelo score combinado do dia)
  const diasCalendario = dias90.map((dia) => calcularScoreDoDia(dia));

  function corIntensidade(score: number | null): string {
    if (score === null) return "#161B26"; // sem nenhuma atividade registrada nesse dia
    if (score === 0) return "#2A2A2D";
    if (score < 40) return "#3A2216";
    if (score < 80) return "#B84420";
    return "#E8541E";
  }

  // Monta a linha do tempo unificada, juntando eventos de hábitos, metas, diário e finanças
  function montarTimeline(): EventoTimeline[] {
    const eventos: EventoTimeline[] = [];

    logs90dias
      .filter((l) => l.done)
      .forEach((log) => {
        const habito = habits.find((h) => h.id === log.habit_id);
        eventos.push({
          data: log.date,
          criadoEm: log.created_at,
          tipo: "habito",
          texto: `Hábito concluído: ${habito?.name ?? "hábito"}`,
          cor: "#E8541E",
        });
      });

    goalsRecentes.forEach((goal) => {
      if (goal.status === "done") {
        eventos.push({
          data: goal.created_at.slice(0, 10),
          criadoEm: goal.created_at,
          tipo: "meta",
          texto: `Meta concluída: ${goal.title}`,
          cor: "#E8541E",
        });
      } else {
        eventos.push({
          data: goal.created_at.slice(0, 10),
          criadoEm: goal.created_at,
          tipo: "meta",
          texto: `Meta criada: ${goal.title}`,
          cor: "#D9A448",
        });
      }
    });

    diarioRecente.forEach((entry) => {
      eventos.push({
        data: entry.entry_date,
        criadoEm: entry.created_at,
        tipo: "diario",
        texto: "Entrada no diário",
        cor: "#3E7CB8",
      });
    });

    transacoesRecentes.forEach((t) => {
      const valorFormatado = t.amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      eventos.push({
        data: t.date,
        criadoEm: t.created_at,
        tipo: "financa",
        texto:
          t.type === "income"
            ? `Receita registrada: ${valorFormatado}`
            : `Despesa registrada: ${valorFormatado}`,
        cor: t.type === "income" ? "#2F9E6E" : "#D9455F",
      });
    });

    return eventos
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .slice(0, 12);
  }

  const timeline = montarTimeline();
  const frase = frasedoDia();

  // Resumo de metas: contagens por status + próxima com prazo mais próximo
  const metasEmAndamento = goalsRecentes.filter((g) => g.status === "in_progress").length;
  const metasConcluidas = goalsRecentes.filter((g) => g.status === "done").length;
  const metasNaoIniciadas = goalsRecentes.filter((g) => g.status === "not_started").length;

  const proximaMetaComPrazo = goalsRecentes
    .filter((g) => g.deadline && g.status !== "done")
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))[0];

  function formatarDataCurta(iso: string): string {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  // Resumo de diário: dias escritos nos últimos 30 dias + humor mais frequente
  const MOOD_LABEL: Record<Mood, { label: string; emoji: string }> = {
    great: { label: "Ótimo", emoji: "😄" },
    good: { label: "Bom", emoji: "🙂" },
    neutral: { label: "Neutro", emoji: "😐" },
    hard: { label: "Difícil", emoji: "😔" },
  };

  const diasEscritos30 = diarioRecente.length;

  function calcularHumorPredominante(): Mood | null {
    const contagem: Record<string, number> = {};
    diarioRecente.forEach((e) => {
      if (e.mood) contagem[e.mood] = (contagem[e.mood] ?? 0) + 1;
    });
    const entradas = Object.entries(contagem);
    if (entradas.length === 0) return null;
    entradas.sort((a, b) => b[1] - a[1]);
    return entradas[0][0] as Mood;
  }

  const humorPredominante = calcularHumorPredominante();

  // Resumo financeiro: saldo total + gasto do mês atual
  function formatarMoeda(valor: number): string {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  const saldoTotal = transacoesRecentes.reduce((acc, t) => {
    return t.type === "income" ? acc + t.amount : acc - t.amount;
  }, 0);

  const mesAtual = hoje.slice(0, 7);
  const gastoMes = transacoesRecentes
    .filter((t) => t.type === "expense" && t.date.startsWith(mesAtual))
    .reduce((acc, t) => acc + t.amount, 0);

  const receitaMes = transacoesRecentes
    .filter((t) => t.type === "income" && t.date.startsWith(mesAtual))
    .reduce((acc, t) => acc + t.amount, 0);

  // Categoria que mais pesou nas despesas deste mês
  const gastosPorCategoriaMes = new Map<string, number>();
  transacoesRecentes
    .filter((t) => t.type === "expense" && t.date.startsWith(mesAtual) && t.category_id)
    .forEach((t) => {
      const atual = gastosPorCategoriaMes.get(t.category_id as string) ?? 0;
      gastosPorCategoriaMes.set(t.category_id as string, atual + t.amount);
    });

  // Top 4 categorias do mês + "Outros", pra alimentar a mini rosca de gastos
  const rankingCategoriasMes = Array.from(gastosPorCategoriaMes.entries())
    .map(([categoriaId, valor]) => ({
      nome: categorias.find((c) => c.id === categoriaId)?.name ?? "Sem categoria",
      cor: categorias.find((c) => c.id === categoriaId)?.color ?? "#57575B",
      valor,
    }))
    .sort((a, b) => b.valor - a.valor);

  const dadosPizzaMes = rankingCategoriasMes.slice(0, 4);
  const somaOutros = rankingCategoriasMes
    .slice(4)
    .reduce((acc, c) => acc + c.valor, 0);
  if (somaOutros > 0) {
    dadosPizzaMes.push({ nome: "Outros", cor: "#57575B", valor: somaOutros });
  }

  // Lançamentos ainda não pagos/recebidos (inclui parcelas futuras)
  const pendentes = transacoesRecentes.filter((t) => !t.paid);
  const totalAPagar = pendentes
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalAReceber = pendentes
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);

  function formatarDataRelativa(iso: string): string {
    const data = new Date(iso + "T12:00:00");
    if (iso === hoje) return "Hoje";
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    if (iso === paraISOLocal(ontem)) return "Ontem";
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  // Resumo de Tarefas: pendentes hoje, vencidas e concluídas hoje
  const tarefasHojePendentes = tarefas.filter(
    (t) => !t.done && t.due_date === hoje
  ).length;
  const tarefasVencidas = tarefas.filter(
    (t) => !t.done && t.due_date !== null && t.due_date < hoje
  ).length;
  const tarefasConcluidasHoje = tarefas.filter(
    (t) => t.done && t.completed_at?.slice(0, 10) === hoje
  ).length;

  // Resumo de Treinos: quantidade na última semana + último treino finalizado
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const treinosSemana = sessoesTreino.filter(
    (s) => s.finished_at && new Date(s.finished_at) >= seteDiasAtras
  ).length;
  const ultimoTreino = sessoesTreino[0];

  // Resumo de Dieta: macros e kcal de hoje vs. gasto calórico estimado (TDEE)
  const totaisDietaHoje = itensDietaHoje.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein_g,
      carb: acc.carb + item.carb_g,
      fat: acc.fat + item.fat_g,
    }),
    { protein: 0, carb: 0, fat: 0 }
  );
  const kcalDietaHoje = calcularKcal(
    totaisDietaHoje.protein,
    totaisDietaHoje.carb,
    totaisDietaHoje.fat
  );
  const tdeeHoje = bodyMetrics ? calcularTDEE(bodyMetrics) : null;
  const deficitDietaHoje = tdeeHoje !== null ? Math.round(kcalDietaHoje - tdeeHoje) : null;

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">
          {saudacao()}
          {nomeUsuario ? `, ${nomeUsuario}` : ""}.
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Aqui está seu progresso recente.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-gold/30 bg-base-surface p-5">
        <p className="font-display text-base font-semibold leading-snug text-ink">
          "{frase.frase}"
        </p>
        <p className="mt-2 text-sm text-ink-muted">{frase.explicacao}</p>
        <CompartilharFrase frase={frase.frase} explicacao={frase.explicacao} />
      </section>

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : (
        <>
          {/* Score Diário */}
          <section className="mb-6 rounded-xl border border-base-border bg-base-surface p-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 font-display text-xl font-bold"
                style={{
                  borderColor: corDoScore(scoreDiario),
                  color: corDoScore(scoreDiario),
                }}
              >
                {scoreDiario ?? "—"}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Score de hoje</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {explicacaoDoScore()}
                </p>
              </div>
            </div>
          </section>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <CardEstatistica
              label="Saldo"
              valor={formatarMoeda(saldoTotal)}
              destaque={saldoTotal >= 0}
            />
            <CardEstatistica
              label="Hábitos hoje"
              valor={totalHoje > 0 ? `${feitosHoje}/${totalHoje}` : "—"}
              sublinha={
                streak > 0
                  ? `${streak} ${streak === 1 ? "dia" : "dias"} seguidos`
                  : undefined
              }
              destaque={totalHoje > 0 && feitosHoje === totalHoje}
              progresso={totalHoje > 0 ? (feitosHoje / totalHoje) * 100 : undefined}
            />
            <CardEstatistica
              label="Tarefas hoje"
              valor={String(tarefasHojePendentes)}
              sublinha={
                tarefasVencidas > 0
                  ? `${tarefasVencidas} ${tarefasVencidas === 1 ? "vencida" : "vencidas"}`
                  : undefined
              }
              sublinhaAlerta={tarefasVencidas > 0}
            />
            <CardEstatistica
              label="Treinos (7 dias)"
              valor={String(treinosSemana)}
            />
          </div>

          {/* Resumo de Metas */}
          <section className="mb-6 rounded-xl border border-base-border bg-base-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Metas</h2>
              <Link
                href="/metas"
                className="text-xs font-medium text-accent hover:underline"
              >
                Ver todas →
              </Link>
            </div>

            {goalsRecentes.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Você ainda não tem metas cadastradas.
              </p>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-base px-2 py-2.5 text-center">
                    <p className="font-display text-xl font-bold tabular-nums text-gold">
                      {metasEmAndamento}
                    </p>
                    <p className="text-xs text-ink-muted">Em andamento</p>
                  </div>
                  <div className="rounded-lg bg-base px-2 py-2.5 text-center">
                    <p className="font-display text-xl font-bold tabular-nums text-accent">
                      {metasConcluidas}
                    </p>
                    <p className="text-xs text-ink-muted">Concluídas</p>
                  </div>
                  <div className="rounded-lg bg-base px-2 py-2.5 text-center">
                    <p className="font-display text-xl font-bold tabular-nums text-ink-faint">
                      {metasNaoIniciadas}
                    </p>
                    <p className="text-xs text-ink-muted">Não iniciadas</p>
                  </div>
                </div>

                {proximaMetaComPrazo && (
                  <div className="rounded-lg bg-base px-3 py-2.5">
                    <p className="text-xs text-ink-faint">Próximo prazo</p>
                    <p className="mt-0.5 text-sm text-ink">
                      {proximaMetaComPrazo.title}
                      <span className="ml-2 text-xs text-ink-muted">
                        {formatarDataCurta(proximaMetaComPrazo.deadline!)}
                      </span>
                    </p>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Resumo de Tarefas */}
          <section className="mb-6 rounded-xl border border-base-border bg-base-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Tarefas</h2>
              <Link
                href="/tarefas"
                className="text-xs font-medium text-accent hover:underline"
              >
                Ver todas →
              </Link>
            </div>

            {tarefas.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Você ainda não tem tarefas cadastradas.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-base px-2 py-2.5 text-center">
                  <p className="font-display text-xl font-bold tabular-nums text-ink">
                    {tarefasHojePendentes}
                  </p>
                  <p className="text-xs text-ink-muted">Para hoje</p>
                </div>
                <div className="rounded-lg bg-base px-2 py-2.5 text-center">
                  <p
                    className={`font-display text-xl font-bold tabular-nums ${
                      tarefasVencidas > 0 ? "text-warn" : "text-ink-faint"
                    }`}
                  >
                    {tarefasVencidas}
                  </p>
                  <p className="text-xs text-ink-muted">Vencidas</p>
                </div>
                <div className="rounded-lg bg-base px-2 py-2.5 text-center">
                  <p className="font-display text-xl font-bold tabular-nums text-accent">
                    {tarefasConcluidasHoje}
                  </p>
                  <p className="text-xs text-ink-muted">Concluídas hoje</p>
                </div>
              </div>
            )}
          </section>

          {/* Resumo de Treinos */}
          <section className="mb-6 rounded-xl border border-base-border bg-base-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Treinos</h2>
              <Link
                href="/treinos"
                className="text-xs font-medium text-accent hover:underline"
              >
                Ver treinos →
              </Link>
            </div>

            {treinosAtivos.length === 0 && sessoesTreino.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Você ainda não tem rotinas de treino cadastradas.
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base px-3 py-2.5 text-center">
                  <p className="font-display text-xl font-bold tabular-nums text-ink">
                    {treinosSemana}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {treinosSemana === 1 ? "treino" : "treinos"} (7 dias)
                  </p>
                </div>
                {ultimoTreino && (
                  <div className="min-w-0 flex-1 rounded-lg bg-base px-3 py-2.5">
                    <p className="truncate text-sm font-medium text-ink">
                      {ultimoTreino.workout_name}
                    </p>
                    <p className="text-xs text-ink-muted">
                      Último treino ·{" "}
                      {ultimoTreino.finished_at
                        ? formatarDataCurta(ultimoTreino.finished_at.slice(0, 10))
                        : ""}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Resumo de Dieta */}
          <section className="mb-6 rounded-xl border border-base-border bg-base-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Dieta</h2>
              <Link
                href="/treinos?aba=dieta"
                className="text-xs font-medium text-accent hover:underline"
              >
                Ver dieta →
              </Link>
            </div>

            {!bodyMetrics ? (
              <p className="text-sm text-ink-muted">
                Configure seu perfil na Dieta para acompanhar seu gasto calórico aqui.
              </p>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-4 gap-2">
                  <div className="rounded-lg bg-base px-1 py-2 text-center">
                    <p className="font-display text-lg font-bold tabular-nums text-accent">
                      {Math.round(totaisDietaHoje.protein)}g
                    </p>
                    <p className="text-[10px] text-ink-muted">Proteína</p>
                  </div>
                  <div className="rounded-lg bg-base px-1 py-2 text-center">
                    <p className="font-display text-lg font-bold tabular-nums text-ink">
                      {Math.round(totaisDietaHoje.carb)}g
                    </p>
                    <p className="text-[10px] text-ink-muted">Carbo</p>
                  </div>
                  <div className="rounded-lg bg-base px-1 py-2 text-center">
                    <p className="font-display text-lg font-bold tabular-nums text-warn">
                      {Math.round(totaisDietaHoje.fat)}g
                    </p>
                    <p className="text-[10px] text-ink-muted">Gordura</p>
                  </div>
                  <div className="rounded-lg bg-base px-1 py-2 text-center">
                    <p className="font-display text-lg font-bold tabular-nums text-ink">
                      {Math.round(kcalDietaHoje)}
                    </p>
                    <p className="text-[10px] text-ink-muted">kcal hoje</p>
                  </div>
                </div>

                {deficitDietaHoje !== null && (
                  <div
                    className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                      deficitDietaHoje <= 0
                        ? "bg-accent-dim text-accent"
                        : "bg-warn-dim text-warn"
                    }`}
                  >
                    {deficitDietaHoje <= 0 ? "Déficit calórico" : "Superávit calórico"}:{" "}
                    {deficitDietaHoje > 0 ? "+" : ""}
                    {deficitDietaHoje} kcal
                  </div>
                )}
              </>
            )}
          </section>

          {/* Água */}
          <div className="mb-6">
            <AguaCard />
          </div>

          {/* Resumo de Diário */}
          <section className="mb-6 rounded-xl border border-base-border bg-base-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Diário</h2>
              <Link
                href="/diario"
                className="text-xs font-medium text-accent hover:underline"
              >
                Ver tudo →
              </Link>
            </div>

            {diasEscritos30 === 0 ? (
              <p className="text-sm text-ink-muted">
                Você ainda não escreveu nenhuma entrada nos últimos 30 dias.
              </p>
            ) : (
              <div className="flex items-center gap-6">
                <div>
                  <p className="font-display text-xl font-bold text-ink">
                    {diasEscritos30}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {diasEscritos30 === 1 ? "dia escrito" : "dias escritos"} (30 dias)
                  </p>
                </div>
                {humorPredominante && (
                  <div>
                    <p className="font-display text-xl font-bold text-ink">
                      {MOOD_LABEL[humorPredominante].emoji}
                    </p>
                    <p className="text-xs text-ink-muted">
                      Humor mais frequente: {MOOD_LABEL[humorPredominante].label}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Resumo de Finanças */}
          <section className="mb-6 rounded-xl border border-base-border bg-base-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Finanças</h2>
              <Link
                href="/financas"
                className="text-xs font-medium text-accent hover:underline"
              >
                Ver detalhes →
              </Link>
            </div>

            {transacoesRecentes.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Você ainda não tem lançamentos cadastrados.
              </p>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div>
                    <p
                      className={`font-display text-lg font-bold ${
                        saldoTotal >= 0 ? "text-accent" : "text-warn"
                      }`}
                    >
                      {formatarMoeda(saldoTotal)}
                    </p>
                    <p className="text-xs text-ink-muted">Saldo total</p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-ink">
                      {formatarMoeda(receitaMes)}
                    </p>
                    <p className="text-xs text-ink-muted">Receita (mês)</p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-warn">
                      {formatarMoeda(gastoMes)}
                    </p>
                    <p className="text-xs text-ink-muted">Gasto (mês)</p>
                  </div>
                </div>

                {dadosPizzaMes.length > 0 && (
                  <div className="mb-3 flex items-center gap-3 rounded-lg bg-base px-3 py-2.5">
                    <div className="h-16 w-16 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dadosPizzaMes}
                            dataKey="valor"
                            nameKey="nome"
                            innerRadius={18}
                            outerRadius={30}
                            paddingAngle={2}
                            stroke="none"
                          >
                            {dadosPizzaMes.map((c, i) => (
                              <Cell key={i} fill={c.cor} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      {dadosPizzaMes.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          <span
                            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: c.cor }}
                          />
                          <span className="truncate text-ink-muted">{c.nome}</span>
                          <span className="ml-auto flex-shrink-0 font-medium text-ink">
                            {formatarMoeda(c.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(totalAPagar > 0 || totalAReceber > 0) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {totalAPagar > 0 && (
                      <span className="rounded-full bg-warn-dim px-2.5 py-1 text-xs font-medium text-warn">
                        {formatarMoeda(totalAPagar)} a pagar
                      </span>
                    )}
                    {totalAReceber > 0 && (
                      <span className="rounded-full bg-accent-dim px-2.5 py-1 text-xs font-medium text-accent">
                        {formatarMoeda(totalAReceber)} a receber
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="mb-6 rounded-xl border border-base-border bg-base-surface p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              Últimos 7 dias
            </h2>
            <div className="flex items-end justify-between gap-2">
              {atividadePorDia7.map((info) => {
                const data = new Date(info.dia + "T12:00:00");
                const isHoje = info.dia === hoje;
                const titulo = [
                  info.totalHabitos > 0
                    ? `${info.feitosHabitos}/${info.totalHabitos} hábitos`
                    : null,
                  info.metasConcluidas > 0 ? `${info.metasConcluidas} metas concluídas` : null,
                  info.metasMovimentadas > 0 ? `${info.metasMovimentadas} metas avançaram` : null,
                  info.tarefasConcluidas > 0 ? `${info.tarefasConcluidas} tarefas concluídas` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Sem atividade";
                return (
                  <div key={info.dia} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-20 w-full items-end overflow-hidden rounded-md bg-base">
                      <div
                        className="w-full rounded-md transition-all"
                        style={{
                          height: `${info.score === null ? 0 : Math.max(info.score, 6)}%`,
                          backgroundColor:
                            info.score !== null && info.score >= 80 ? "#E8541E" : "#57575B",
                        }}
                        title={titulo}
                      />
                    </div>
                    <span
                      className={`text-xs ${
                        isHoje ? "font-semibold text-accent" : "text-ink-faint"
                      }`}
                    >
                      {DIAS_SEMANA[data.getDay()]}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Calendário de constância — últimos 90 dias, combinando hábitos, metas e tarefas */}
          <section className="mb-6 rounded-xl border border-base-border bg-base-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">
                Constância (últimos 90 dias)
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                <span>Menos</span>
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#2A2A2D" }} />
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#3A2216" }} />
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#B84420" }} />
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#E8541E" }} />
                <span>Mais</span>
              </div>
            </div>
            <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
              {diasCalendario.map((info) => {
                const data = new Date(info.dia + "T12:00:00");
                const label = data.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                });
                const titulo = [
                  info.totalHabitos > 0
                    ? `${info.feitosHabitos}/${info.totalHabitos} hábitos`
                    : null,
                  info.metasConcluidas > 0 ? `${info.metasConcluidas} metas concluídas` : null,
                  info.metasMovimentadas > 0 ? `${info.metasMovimentadas} metas avançaram` : null,
                  info.tarefasConcluidas > 0 ? `${info.tarefasConcluidas} tarefas concluídas` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Sem atividade";
                return (
                  <div
                    key={info.dia}
                    title={`${label}: ${titulo}`}
                    className="aspect-square w-full rounded-sm"
                    style={{ backgroundColor: corIntensidade(info.score) }}
                  />
                );
              })}
            </div>
          </section>

          {/* Linha do tempo de eventos recentes */}
          <section className="mb-6 rounded-xl border border-base-border bg-base-surface p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              Atividade recente
            </h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Suas ações recentes vão aparecer aqui.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {timeline.map((evento, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: evento.cor }}
                    />
                    <span className="flex-1 text-sm text-ink-muted">
                      {evento.texto}
                    </span>
                    <span className="flex-shrink-0 text-xs text-ink-faint">
                      {formatarDataRelativa(evento.data)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {habits.length === 0 && (
            <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
              <p className="mb-3 text-sm text-ink-muted">
                Você ainda não tem hábitos cadastrados.
              </p>
              <Link
                href="/habitos"
                className="text-sm font-medium text-accent hover:underline"
              >
                Criar meu primeiro hábito →
              </Link>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function CardEstatistica({
  label,
  valor,
  sublinha,
  sublinhaAlerta,
  destaque,
  progresso,
}: {
  label: string;
  valor: string;
  sublinha?: string;
  sublinhaAlerta?: boolean;
  destaque?: boolean;
  progresso?: number;
}) {
  const tamanhoValor =
    valor.length > 9 ? "text-lg" : valor.length > 6 ? "text-xl" : "text-2xl";

  return (
    <div className="min-w-0 rounded-xl border border-base-border bg-base-surface p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={`mt-1 break-words font-display font-bold tabular-nums leading-tight ${tamanhoValor} ${
          destaque ? "text-accent" : "text-ink"
        }`}
      >
        {valor}
      </p>
      {sublinha && (
        <p
          className={`mt-0.5 truncate text-xs ${
            sublinhaAlerta ? "text-warn" : "text-ink-faint"
          }`}
        >
          {sublinha}
        </p>
      )}
      {typeof progresso === "number" && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-base">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
