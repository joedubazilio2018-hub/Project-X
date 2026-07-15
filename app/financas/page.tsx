"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import SwipeRow from "@/components/SwipeRow";
import type {
  Category,
  Transaction,
  TransactionType,
  Goal,
} from "@/types/database";

type MetaVinculavel = Pick<Goal, "id" | "title" | "target_amount" | "current_amount">;

const CORES_CATEGORIA = ["#E5E5E3", "#C7C7C5", "#B0B0AD", "#8A8F98", "#71717A", "#3A3A3D"];
const LANCAMENTOS_POR_PAGINA = 50;

function hojeISO(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function adicionarMeses(dataISO: string, meses: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const totalMeses = mes - 1 + meses;
  const novoAno = ano + Math.floor(totalMeses / 12);
  const novoMesIndex = ((totalMeses % 12) + 12) % 12;
  const ultimoDiaDoMes = new Date(novoAno, novoMesIndex + 1, 0).getDate();
  const novoDia = Math.min(dia, ultimoDiaDoMes);
  const mesStr = String(novoMesIndex + 1).padStart(2, "0");
  const diaStr = String(novoDia).padStart(2, "0");
  return `${novoAno}-${mesStr}-${diaStr}`;
}

function formatarDataCurta(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function estaAtrasada(t: Transaction): boolean {
  return t.type === "expense" && !t.paid && t.date < hojeISO();
}

export default function FinancasPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [metasVinculaveis, setMetasVinculaveis] = useState<MetaVinculavel[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginaAtual, setPaginaAtual] = useState(1);

  const [tipo, setTipo] = useState<TransactionType>("expense");
  const [valor, setValor] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hojeISO());
  const [mostrarFormLancamento, setMostrarFormLancamento] = useState(false);

  const [repetir, setRepetir] = useState(false);
  const [totalParcelas, setTotalParcelas] = useState("2");

  const [editandoTransacao, setEditandoTransacao] = useState<Transaction | null>(null);
  const [aplicarEmTodasParcelas, setAplicarEmTodasParcelas] = useState(false);
  const editandoId = editandoTransacao?.id ?? null;

  const [novaCategoria, setNovaCategoria] = useState("");
  const [novaCategoriaMetaId, setNovaCategoriaMetaId] = useState("");
  const [mostrarFormCategoria, setMostrarFormCategoria] = useState(false);

  const [mesPlanejamentoAberto, setMesPlanejamentoAberto] = useState<string | null>(null);

  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: t } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });
    const { data: c } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });
    const { data: g } = await supabase
      .from("goals")
      .select("id, title, target_amount, current_amount")
      .not("target_amount", "is", null)
      .order("created_at", { ascending: false });

    setTransactions((t as Transaction[]) ?? []);
    setCategories((c as Category[]) ?? []);
    setMetasVinculaveis((g as MetaVinculavel[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function resetFormLancamento() {
    setValor("");
    setDescricao("");
    setCategoriaId("");
    setData(hojeISO());
    setRepetir(false);
    setTotalParcelas("2");
    setMostrarFormLancamento(false);
    setEditandoTransacao(null);
    setAplicarEmTodasParcelas(false);
  }

  function iniciarEdicao(t: Transaction) {
    setEditandoTransacao(t);
    setAplicarEmTodasParcelas(false);
    setTipo(t.type);
    setValor(String(t.amount).replace(".", ","));
    setCategoriaId(t.category_id ?? "");
    setDescricao(t.description ?? "");
    setData(t.date);
    setRepetir(false);
    setMostrarFormLancamento(true);
  }

  function cancelarEdicao() {
    resetFormLancamento();
  }

  async function ajustarMetaVinculada(categoryId: string | null | undefined, delta: number) {
    if (!categoryId || !delta) return;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat?.linked_goal_id) return;

    const { data: metaAtual } = await supabase
      .from("goals")
      .select("current_amount")
      .eq("id", cat.linked_goal_id)
      .single();

    const atual = Number(metaAtual?.current_amount ?? 0);
    const novoValor = Number((atual + delta).toFixed(2));

    await supabase.from("goals").update({ current_amount: novoValor }).eq("id", cat.linked_goal_id);
  }

  async function salvarLancamento(e: React.FormEvent) {
    e.preventDefault();
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!valorNum || valorNum <= 0) return;
    setSalvando(true);

    if (editandoTransacao) {
      const camposComuns = {
        type: tipo,
        amount: valorNum,
        category_id: categoriaId || null,
        description: descricao.trim() || null,
      };

      if (aplicarEmTodasParcelas && editandoTransacao.recurrence_group_id) {
        const parcelasDoGrupo = transactions.filter(
          (t) => t.recurrence_group_id === editandoTransacao.recurrence_group_id
        );
        const totalAntigo = parcelasDoGrupo.reduce((s, t) => s + t.amount, 0);

        await supabase
          .from("transactions")
          .update(camposComuns)
          .eq("recurrence_group_id", editandoTransacao.recurrence_group_id);

        await ajustarMetaVinculada(editandoTransacao.category_id, -totalAntigo);
        await ajustarMetaVinculada(categoriaId || null, valorNum * parcelasDoGrupo.length);
      } else if (!editandoTransacao.recurrence_group_id && repetir) {
        const qtdParcelas = Math.max(2, parseInt(totalParcelas, 10) || 2);
        const grupoId = crypto.randomUUID();

        await supabase
          .from("transactions")
          .update({
            ...camposComuns,
            date: data,
            recurrence_group_id: grupoId,
            installment_number: 1,
            installment_total: qtdParcelas,
          })
          .eq("id", editandoTransacao.id);

        const novasParcelas = Array.from({ length: qtdParcelas - 1 }).map(
          (_, i) => ({
            user_id: editandoTransacao.user_id,
            type: tipo,
            amount: valorNum,
            category_id: categoriaId || null,
            description: descricao.trim() || null,
            date: adicionarMeses(data, i + 1),
            recurrence_group_id: grupoId,
            installment_number: i + 2,
            installment_total: qtdParcelas,
          })
        );

        if (novasParcelas.length > 0) {
          await supabase.from("transactions").insert(novasParcelas);
        }

        await ajustarMetaVinculada(editandoTransacao.category_id, -editandoTransacao.amount);
        await ajustarMetaVinculada(categoriaId || null, valorNum * qtdParcelas);
      } else {
        await supabase
          .from("transactions")
          .update({ ...camposComuns, date: data })
          .eq("id", editandoTransacao.id);

        await ajustarMetaVinculada(editandoTransacao.category_id, -editandoTransacao.amount);
        await ajustarMetaVinculada(categoriaId || null, valorNum);
      }

      resetFormLancamento();
      setSalvando(false);
      carregar();
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSalvando(false);
      return;
    }

    const qtdParcelas = repetir ? Math.max(2, parseInt(totalParcelas, 10) || 2) : 1;
    const grupoId = qtdParcelas > 1 ? crypto.randomUUID() : null;

    const linhas = Array.from({ length: qtdParcelas }).map((_, i) => ({
      user_id: userId,
      type: tipo,
      amount: valorNum,
      category_id: categoriaId || null,
      description: descricao.trim() || null,
      date: adicionarMeses(data, i),
      recurrence_group_id: grupoId,
      installment_number: qtdParcelas > 1 ? i + 1 : null,
      installment_total: qtdParcelas > 1 ? qtdParcelas : null,
    }));

    await supabase.from("transactions").insert(linhas);
    await ajustarMetaVinculada(categoriaId || null, valorNum * qtdParcelas);

    resetFormLancamento();
    setPaginaAtual(1);
    setSalvando(false);
    carregar();
  }

  async function excluirLancamento(t: Transaction) {
    if (t.recurrence_group_id) {
      const apagarTodas = window.confirm(
        "Esse lançamento faz parte de uma recorrência/parcelamento. Clique OK para apagar TODAS as parcelas, ou Cancelar para apagar apenas esta parcela."
      );
      if (apagarTodas) {
        const parcelasDoGrupo = transactions.filter(
          (tx) => tx.recurrence_group_id === t.recurrence_group_id
        );
        const totalGrupo = parcelasDoGrupo.reduce((s, tx) => s + tx.amount, 0);

        setTransactions((prev) =>
          prev.filter((tx) => tx.recurrence_group_id !== t.recurrence_group_id)
        );
        await supabase
          .from("transactions")
          .delete()
          .eq("recurrence_group_id", t.recurrence_group_id);
        await ajustarMetaVinculada(t.category_id, -totalGrupo);
        return;
      }
    }
    setTransactions((prev) => prev.filter((tx) => tx.id !== t.id));
    await supabase.from("transactions").delete().eq("id", t.id);
    await ajustarMetaVinculada(t.category_id, -t.amount);
  }

  async function alternarPago(t: Transaction) {
    const novoPago = !t.paid;
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === t.id ? { ...tx, paid: novoPago } : tx))
    );
    await supabase.from("transactions").update({ paid: novoPago }).eq("id", t.id);
  }

  async function criarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const cor = CORES_CATEGORIA[categories.length % CORES_CATEGORIA.length];

    await supabase.from("categories").insert({
      user_id: userId,
      name: novaCategoria.trim(),
      color: cor,
      linked_goal_id: novaCategoriaMetaId || null,
    });

    setNovaCategoria("");
    setNovaCategoriaMetaId("");
    setMostrarFormCategoria(false);
    setSalvando(false);
    carregar();
  }

  async function excluirCategoria(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("categories").delete().eq("id", id);
  }

  async function vincularCategoriaAMeta(categoryId: string, goalId: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, linked_goal_id: goalId || null } : c))
    );
    await supabase
      .from("categories")
      .update({ linked_goal_id: goalId || null })
      .eq("id", categoryId);
  }

  // ── Cálculos derivados ──
  const mesAtual = hojeISO().slice(0, 7);

  // Saldo devedor: soma das despesas AINDA NÃO PAGAS com competência até o mês
  // atual (inclui atrasadas de meses anteriores que ficaram pra trás). Diminui
  // conforme você marca contas como pagas, e sobe de novo quando vira o mês e
  // entram as contas novas.
  const saldoDevedor = useMemo(() => {
    return transactions
      .filter(
        (t) => t.type === "expense" && !t.paid && t.date.slice(0, 7) <= mesAtual
      )
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, mesAtual]);

  const transacoesMes = transactions.filter((t) => t.date.startsWith(mesAtual));
  const receitasMes = transacoesMes
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + t.amount, 0);
  const despesasMes = transacoesMes
    .filter((t) => t.type === "expense")
    .reduce((a, t) => a + t.amount, 0);

  const historicoLancamentos = useMemo(
    () => transactions.filter((t) => t.date.slice(0, 7) <= mesAtual),
    [transactions, mesAtual]
  );

  const contasAtrasadas = useMemo(
    () => historicoLancamentos.filter((t) => estaAtrasada(t)),
    [historicoLancamentos]
  );

  // Paginação: mostra LANCAMENTOS_POR_PAGINA por vez, com botão "Ver mais"
  const totalExibidos = paginaAtual * LANCAMENTOS_POR_PAGINA;
  const lancamentosVisiveis = historicoLancamentos.slice(0, totalExibidos);
  const temMais = historicoLancamentos.length > totalExibidos;

  const dadosPizza = useMemo(() => {
    const mapa: Record<string, { name: string; value: number; color: string }> = {};
    transacoesMes
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = categories.find((c) => c.id === t.category_id);
        const nome = cat?.name ?? "Sem categoria";
        const cor = cat?.color ?? "#57575B";
        if (!mapa[nome]) mapa[nome] = { name: nome, value: 0, color: cor };
        mapa[nome].value += t.amount;
      });
    return Object.values(mapa);
  }, [transacoesMes, categories]);

  const dadosLinha = useMemo(() => {
    const dias: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const dia = String(d.getDate()).padStart(2, "0");
      dias.push(`${ano}-${mes}-${dia}`);
    }

    const ordenadas = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let saldoAcumulado = 0;
    let idx = 0;

    while (idx < ordenadas.length && ordenadas[idx].date < dias[0]) {
      saldoAcumulado += ordenadas[idx].type === "income" ? ordenadas[idx].amount : -ordenadas[idx].amount;
      idx++;
    }

    return dias.map((dia) => {
      while (idx < ordenadas.length && ordenadas[idx].date === dia) {
        saldoAcumulado += ordenadas[idx].type === "income" ? ordenadas[idx].amount : -ordenadas[idx].amount;
        idx++;
      }
      const d = new Date(dia + "T12:00:00");
      return {
        dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        saldo: Number(saldoAcumulado.toFixed(2)),
      };
    });
  }, [transactions]);

  const planejamento = useMemo(() => {
    const meses: {
      chave: string;
      label: string;
      receitas: number;
      despesas: number;
      itens: Transaction[];
    }[] = [];
    const hoje = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const itens = transactions
        .filter((t) => t.date.startsWith(chave))
        .sort((a, b) => a.date.localeCompare(b.date));
      const receitas = itens
        .filter((t) => t.type === "income")
        .reduce((a, t) => a + t.amount, 0);
      const despesas = itens
        .filter((t) => t.type === "expense")
        .reduce((a, t) => a + t.amount, 0);
      meses.push({ chave, label, receitas, despesas, itens });
    }
    return meses;
  }, [transactions]);

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Finanças</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Seus lançamentos, categorias e metas financeiras.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-xl border border-base-border bg-base-surface p-4">
              <p className="text-xs text-ink-muted">Saldo devedor</p>
              <p
                className={`mt-1 font-display text-xl font-bold ${
                  saldoDevedor > 0 ? "text-warn" : "text-accent"
                }`}
              >
                {formatarMoeda(saldoDevedor)}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-faint">
                Contas do mês + atrasadas, ainda não pagas
              </p>
            </div>
            <div className="rounded-xl border border-base-border bg-base-surface p-4">
              <p className="text-xs text-ink-muted">Receitas (mês)</p>
              <p className="mt-1 font-display text-xl font-bold text-accent">
                {formatarMoeda(receitasMes)}
              </p>
            </div>
            <div className="rounded-xl border border-base-border bg-base-surface p-4">
              <p className="text-xs text-ink-muted">Despesas (mês)</p>
              <p className="mt-1 font-display text-xl font-bold text-warn">
                {formatarMoeda(despesasMes)}
              </p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-base-border bg-base-surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink">Gastos por categoria (mês)</h2>
              {dadosPizza.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">Sem despesas registradas neste mês.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={dadosPizza} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                      {dadosPizza.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatarMoeda(value)}
                      contentStyle={{ backgroundColor: "#16161B", border: "1px solid #2A2A2D", borderRadius: 8, color: "#F0F0EE" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-base-border bg-base-surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink">Evolução do saldo (30 dias)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dadosLinha}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2D" />
                  <XAxis dataKey="dia" tick={{ fill: "#9C9CA0", fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fill: "#9C9CA0", fontSize: 11 }} width={50} />
                  <Tooltip
                    formatter={(value: number) => formatarMoeda(value)}
                    contentStyle={{ backgroundColor: "#16161B", border: "1px solid #2A2A2D", borderRadius: 8, color: "#F0F0EE" }}
                  />
                  <Line type="monotone" dataKey="saldo" stroke="#E5E5E3" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Categorias */}
          <section className="mb-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Categorias</h2>
              <button onClick={() => setMostrarFormCategoria((v) => !v)} className="text-xs font-medium text-accent hover:underline">
                {mostrarFormCategoria ? "Cancelar" : "+ Nova categoria"}
              </button>
            </div>

            {mostrarFormCategoria && (
              <form onSubmit={criarCategoria} className="mb-3 flex flex-col gap-3 rounded-xl border border-base-border bg-base-surface p-4 sm:flex-row sm:flex-wrap sm:items-center">
                <input value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="Ex: Alimentação" className="w-full flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:min-w-[160px]" required />
                <select
                  value={novaCategoriaMetaId}
                  onChange={(e) => setNovaCategoriaMetaId(e.target.value)}
                  className="w-full rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:w-56"
                >
                  <option value="">Não vincular a nenhuma meta</option>
                  {metasVinculaveis.map((m) => (
                    <option key={m.id} value={m.id}>
                      Alimentar: {m.title}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={salvando} className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto">Salvar</button>
              </form>
            )}

            <div className="flex flex-col gap-2">
              {categories.map((cat) => {
                const metaLigada = metasVinculaveis.find((m) => m.id === cat.linked_goal_id);
                return (
                  <div key={cat.id} className="group flex flex-wrap items-center gap-2 rounded-xl border border-base-border px-3 py-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-ink">{cat.name}</span>
                    <select
                      value={cat.linked_goal_id ?? ""}
                      onChange={(e) => vincularCategoriaAMeta(cat.id, e.target.value)}
                      className="ml-auto rounded-lg border border-base-border bg-base px-2 py-1 text-[11px] text-ink-muted outline-none focus:border-accent"
                    >
                      <option value="">Sem vínculo com meta</option>
                      {metasVinculaveis.map((m) => (
                        <option key={m.id} value={m.id}>
                          Alimentar: {m.title}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => excluirCategoria(cat.id)} className="hidden text-ink-faint hover:text-warn group-hover:inline">×</button>
                    {metaLigada && (
                      <p className="basis-full text-[11px] text-ink-faint">
                        Lançamentos aqui somam ao progresso de "{metaLigada.title}" ({formatarMoeda(metaLigada.current_amount)} / {formatarMoeda(metaLigada.target_amount ?? 0)})
                      </p>
                    )}
                  </div>
                );
              })}
              {categories.length === 0 && <p className="text-sm text-ink-muted">Nenhuma categoria ainda.</p>}
            </div>
          </section>

          {/* Lançamentos */}
          <section className="mb-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">
                Lançamentos
                {historicoLancamentos.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-ink-faint">
                    ({historicoLancamentos.length} no total)
                  </span>
                )}
              </h2>
              <button
                onClick={() => {
                  if (mostrarFormLancamento) {
                    resetFormLancamento();
                  } else {
                    setMostrarFormLancamento(true);
                  }
                }}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
              >
                {mostrarFormLancamento ? "Cancelar" : "+ Novo lançamento"}
              </button>
            </div>

            {mostrarFormLancamento && (
              <form onSubmit={salvarLancamento} className="mb-4 flex flex-col gap-3 rounded-xl border border-base-border bg-base-surface p-5">
                {editandoId && <p className="text-xs font-medium text-accent">Editando lançamento existente</p>}

                {editandoTransacao?.recurrence_group_id && (
                  <div className="rounded-lg border border-accent/40 bg-accent-dim p-3 text-xs">
                    <p className="mb-2 font-medium text-ink">
                      Essa parcela faz parte de uma recorrência ({editandoTransacao.installment_number}/{editandoTransacao.installment_total}). Deseja alterar apenas esta parcela ou todas?
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-2 text-ink-muted">
                        <input type="radio" name="escopoEdicao" checked={!aplicarEmTodasParcelas} onChange={() => setAplicarEmTodasParcelas(false)} className="accent-accent" />
                        Somente esta parcela
                      </label>
                      <label className="flex items-center gap-2 text-ink-muted">
                        <input type="radio" name="escopoEdicao" checked={aplicarEmTodasParcelas} onChange={() => setAplicarEmTodasParcelas(true)} className="accent-accent" />
                        Todas as parcelas do grupo (datas individuais não mudam)
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={() => setTipo("expense")} className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${tipo === "expense" ? "border-warn bg-warn-dim text-warn" : "border-base-border text-ink-muted"}`}>Despesa</button>
                  <button type="button" onClick={() => setTipo("income")} className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${tipo === "income" ? "border-accent bg-accent-dim text-accent" : "border-base-border text-ink-muted"}`}>Receita</button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor (ex: 49,90)" inputMode="decimal" className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:flex-1" required />
                  <div className="flex flex-col gap-1">
                    <input type="date" value={data} onChange={(e) => setData(e.target.value)} disabled={aplicarEmTodasParcelas} className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50" />
                    {aplicarEmTodasParcelas && <span className="text-xs text-ink-faint">Datas individuais não mudam</span>}
                  </div>
                </div>

                <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent">
                  <option value="">Sem categoria</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>

                <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent" />

                {(!editandoId || !editandoTransacao?.recurrence_group_id) && (
                  <div className="flex flex-col gap-2 rounded-lg border border-base-border bg-base p-3">
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input type="checkbox" checked={repetir} onChange={(e) => setRepetir(e.target.checked)} className="h-4 w-4 rounded border-base-border accent-accent" />
                      {editandoId ? "Transformar em recorrência" : "Repetir em vários meses (parcelado ou recorrente)"}
                    </label>

                    {repetir && (
                      <div className="flex items-center gap-2 pl-6">
                        <span className="text-xs text-ink-muted">Repetir por</span>
                        <input type="number" min={2} max={60} value={totalParcelas} onChange={(e) => setTotalParcelas(e.target.value)} className="w-16 rounded-lg border border-base-border bg-base-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                        <span className="text-xs text-ink-muted">meses (1/{totalParcelas || "?"}, 2/{totalParcelas || "?"}...)</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button type="submit" disabled={salvando} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50">
                    {editandoId ? "Salvar alterações" : "Salvar lançamento"}
                  </button>
                  {editandoId && (
                    <button type="button" onClick={cancelarEdicao} className="text-sm font-medium text-ink-muted hover:text-ink">Cancelar edição</button>
                  )}
                </div>
              </form>
            )}

            {contasAtrasadas.length > 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-warn/40 bg-warn-dim px-4 py-2.5 text-xs font-medium text-warn">
                ⚠ Você tem {contasAtrasadas.length} {contasAtrasadas.length > 1 ? "contas atrasadas" : "conta atrasada"}.
              </div>
            )}

            {historicoLancamentos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
                <p className="text-sm text-ink-muted">Você ainda não tem lançamentos.</p>
              </div>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {lancamentosVisiveis.map((t) => {
                    const cat = categories.find((c) => c.id === t.category_id);
                    return (
                      <li key={t.id}>
                        <SwipeRow onEdit={() => iniciarEdicao(t)} onDelete={() => excluirLancamento(t)}>
                          <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => alternarPago(t)}
                                title={t.paid ? "Marcar como pendente" : t.type === "income" ? "Marcar como recebido" : "Marcar como pago"}
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${t.paid ? "border-accent bg-accent text-base" : estaAtrasada(t) ? "border-warn text-transparent hover:border-warn" : "border-base-border text-transparent hover:border-accent"}`}
                              >
                                ✓
                              </button>
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat?.color ?? "#57575B" }} />
                              <div>
                                <p className="text-sm text-ink">
                                  {t.description || cat?.name || "Lançamento"}
                                  {t.installment_total ? (
                                    <span className="ml-1.5 text-xs text-ink-faint">({t.installment_number}/{t.installment_total})</span>
                                  ) : null}
                                  {t.paid ? (
                                    <span className="ml-1.5 rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] font-medium text-accent">{t.type === "income" ? "Recebido" : "Pago"}</span>
                                  ) : estaAtrasada(t) ? (
                                    <span className="ml-1.5 rounded-full bg-warn-dim px-1.5 py-0.5 text-[10px] font-medium text-warn">Atrasada</span>
                                  ) : null}
                                </p>
                                <p className="text-xs text-ink-faint">
                                  {formatarDataCurta(t.date)}{cat ? ` · ${cat.name}` : ""}
                                </p>
                              </div>
                            </div>
                            <span className={`text-sm font-semibold ${t.type === "income" ? "text-accent" : "text-warn"}`}>
                              {t.type === "income" ? "+" : "−"}{formatarMoeda(t.amount)}
                            </span>
                          </div>
                        </SwipeRow>
                      </li>
                    );
                  })}
                </ul>

                {temMais && (
                  <button
                    onClick={() => setPaginaAtual((p) => p + 1)}
                    className="mt-3 w-full rounded-lg border border-base-border py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    Ver mais ({historicoLancamentos.length - totalExibidos} restantes)
                  </button>
                )}
              </>
            )}
          </section>

          {/* Planejamento dos próximos meses */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">Planejamento dos próximos meses</h2>
            <div className="flex flex-col gap-2">
              {planejamento.map((m) => {
                const aberto = mesPlanejamentoAberto === m.chave;
                const saldoMes = m.receitas - m.despesas;
                return (
                  <div key={m.chave} className="overflow-hidden rounded-xl border border-base-border bg-base-surface">
                    <button type="button" onClick={() => setMesPlanejamentoAberto(aberto ? null : m.chave)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                      <span className="text-sm font-medium capitalize text-ink">{m.label}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-accent">+{formatarMoeda(m.receitas)}</span>
                        <span className="text-warn">−{formatarMoeda(m.despesas)}</span>
                        <span className={`font-semibold ${saldoMes >= 0 ? "text-accent" : "text-warn"}`}>{formatarMoeda(saldoMes)}</span>
                      </div>
                    </button>
                    {aberto && (
                      <ul className="flex flex-col gap-1 border-t border-base-border px-4 py-2">
                        {m.itens.length === 0 ? (
                          <li className="py-2 text-xs text-ink-faint">Nenhum lançamento previsto para este mês.</li>
                        ) : (
                          m.itens.map((t) => {
                            const cat = categories.find((c) => c.id === t.category_id);
                            return (
                              <li key={t.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-ink-muted">
                                    {formatarDataCurta(t.date)} · {t.description || cat?.name || "Lançamento"}
                                    {t.installment_total ? ` (${t.installment_number}/${t.installment_total})` : ""}
                                  </span>
                                  {t.paid ? (
                                    <span className="rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] font-medium text-accent">{t.type === "income" ? "Recebido" : "Pago"}</span>
                                  ) : estaAtrasada(t) ? (
                                    <span className="rounded-full bg-warn-dim px-1.5 py-0.5 text-[10px] font-medium text-warn">Atrasada</span>
                                  ) : null}
                                </div>
                                <span className={t.type === "income" ? "text-accent" : "text-warn"}>
                                  {t.type === "income" ? "+" : "−"}{formatarMoeda(t.amount)}
                                </span>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
