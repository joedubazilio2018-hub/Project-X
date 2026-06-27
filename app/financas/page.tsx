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
  FinancialGoal,
} from "@/types/database";

const CORES_CATEGORIA = ["#2DD4BF", "#F2B84B", "#FB7185", "#60A5FA", "#A78BFA", "#34D399"];

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function FinancasPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulário de lançamento
  const [tipo, setTipo] = useState<TransactionType>("expense");
  const [valor, setValor] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hojeISO());
  const [mostrarFormLancamento, setMostrarFormLancamento] = useState(false);

  // Formulário de categoria
  const [novaCategoria, setNovaCategoria] = useState("");
  const [mostrarFormCategoria, setMostrarFormCategoria] = useState(false);

  // Formulário de meta financeira
  const [tituloMeta, setTituloMeta] = useState("");
  const [valorMeta, setValorMeta] = useState("");
  const [mostrarFormMeta, setMostrarFormMeta] = useState(false);

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
    const { data: fg } = await supabase
      .from("financial_goals")
      .select("*")
      .order("created_at", { ascending: false });

    setTransactions((t as Transaction[]) ?? []);
    setCategories((c as Category[]) ?? []);
    setFinancialGoals((fg as FinancialGoal[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ── Lançamentos ──
  async function criarLancamento(e: React.FormEvent) {
    e.preventDefault();
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!valorNum || valorNum <= 0) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    await supabase.from("transactions").insert({
      user_id: userId,
      type: tipo,
      amount: valorNum,
      category_id: categoriaId || null,
      description: descricao.trim() || null,
      date: data,
    });

    setValor("");
    setDescricao("");
    setCategoriaId("");
    setData(hojeISO());
    setMostrarFormLancamento(false);
    setSalvando(false);
    carregar();
  }

  async function excluirLancamento(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("transactions").delete().eq("id", id);
  }

  // ── Categorias ──
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
    });

    setNovaCategoria("");
    setMostrarFormCategoria(false);
    setSalvando(false);
    carregar();
  }

  async function excluirCategoria(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("categories").delete().eq("id", id);
  }

  // ── Metas financeiras ──
  async function criarMetaFinanceira(e: React.FormEvent) {
    e.preventDefault();
    const valorNum = parseFloat(valorMeta.replace(",", "."));
    if (!tituloMeta.trim() || !valorNum || valorNum <= 0) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    await supabase.from("financial_goals").insert({
      user_id: userId,
      title: tituloMeta.trim(),
      target_amount: valorNum,
      current_amount: 0,
    });

    setTituloMeta("");
    setValorMeta("");
    setMostrarFormMeta(false);
    setSalvando(false);
    carregar();
  }

  async function excluirMetaFinanceira(id: string) {
    setFinancialGoals((prev) => prev.filter((g) => g.id !== id));
    await supabase.from("financial_goals").delete().eq("id", id);
  }

  // ── Cálculos derivados ──
  const saldoTotal = useMemo(() => {
    return transactions.reduce((acc, t) => {
      return t.type === "income" ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [transactions]);

  const mesAtual = hojeISO().slice(0, 7);
  const transacoesMes = transactions.filter((t) => t.date.startsWith(mesAtual));
  const receitasMes = transacoesMes
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + t.amount, 0);
  const despesasMes = transacoesMes
    .filter((t) => t.type === "expense")
    .reduce((a, t) => a + t.amount, 0);

  // Dados pro gráfico de pizza (gastos por categoria, mês atual)
  const dadosPizza = useMemo(() => {
    const mapa: Record<string, { name: string; value: number; color: string }> = {};
    transacoesMes
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = categories.find((c) => c.id === t.category_id);
        const nome = cat?.name ?? "Sem categoria";
        const cor = cat?.color ?? "#5A6172";
        if (!mapa[nome]) mapa[nome] = { name: nome, value: 0, color: cor };
        mapa[nome].value += t.amount;
      });
    return Object.values(mapa);
  }, [transacoesMes, categories]);

  // Dados pro gráfico de linha (evolução do saldo, últimos 30 dias)
  const dadosLinha = useMemo(() => {
    const dias: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dias.push(d.toISOString().slice(0, 10));
    }

    const ordenadas = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let saldoAcumulado = 0;
    let idx = 0;

    // soma tudo que aconteceu antes do início da janela de 30 dias
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
              <p className="text-xs text-ink-muted">Saldo total</p>
              <p
                className={`mt-1 font-display text-xl font-bold ${
                  saldoTotal >= 0 ? "text-accent" : "text-warn"
                }`}
              >
                {formatarMoeda(saldoTotal)}
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
              <h2 className="mb-3 text-sm font-semibold text-ink">
                Gastos por categoria (mês)
              </h2>
              {dadosPizza.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">
                  Sem despesas registradas neste mês.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={dadosPizza}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name }) => name}
                    >
                      {dadosPizza.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatarMoeda(value)}
                      contentStyle={{
                        backgroundColor: "#12161F",
                        border: "1px solid #1F2530",
                        borderRadius: 8,
                        color: "#E7EAF0",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-base-border bg-base-surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink">
                Evolução do saldo (30 dias)
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dadosLinha}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2530" />
                  <XAxis
                    dataKey="dia"
                    tick={{ fill: "#8B93A5", fontSize: 11 }}
                    interval={4}
                  />
                  <YAxis tick={{ fill: "#8B93A5", fontSize: 11 }} width={50} />
                  <Tooltip
                    formatter={(value: number) => formatarMoeda(value)}
                    contentStyle={{
                      backgroundColor: "#12161F",
                      border: "1px solid #1F2530",
                      borderRadius: 8,
                      color: "#E7EAF0",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    stroke="#2DD4BF"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metas financeiras */}
          <section className="mb-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Metas financeiras</h2>
              <button
                onClick={() => setMostrarFormMeta((v) => !v)}
                className="text-xs font-medium text-accent hover:underline"
              >
                {mostrarFormMeta ? "Cancelar" : "+ Nova meta"}
              </button>
            </div>

            {mostrarFormMeta && (
              <form
                onSubmit={criarMetaFinanceira}
                className="mb-3 flex flex-col gap-3 rounded-xl border border-base-border bg-base-surface p-4 sm:flex-row sm:flex-wrap sm:items-center"
              >
                <input
                  value={tituloMeta}
                  onChange={(e) => setTituloMeta(e.target.value)}
                  placeholder="Ex: Guardar por mês"
                  className="w-full rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:min-w-[180px] sm:flex-1"
                  required
                />
                <input
                  value={valorMeta}
                  onChange={(e) => setValorMeta(e.target.value)}
                  placeholder="Valor alvo (ex: 500)"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:w-40"
                  required
                />
                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
                >
                  Salvar
                </button>
              </form>
            )}

            {financialGoals.length === 0 ? (
              <p className="text-sm text-ink-muted">Nenhuma meta financeira ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {financialGoals.map((goal) => {
                  const pct = Math.min(
                    (goal.current_amount / goal.target_amount) * 100,
                    100
                  );
                  return (
                    <li
                      key={goal.id}
                      className="group rounded-xl border border-base-border bg-base-surface p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-ink">
                          {goal.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink-muted">
                            {formatarMoeda(goal.current_amount)} /{" "}
                            {formatarMoeda(goal.target_amount)}
                          </span>
                          <button
                            onClick={() => excluirMetaFinanceira(goal.id)}
                            className="hidden text-xs text-ink-faint transition-colors hover:text-warn group-hover:block"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-base">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

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
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  placeholder="Ex: Alimentação"
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
              {categories.map((cat) => (
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
                    onClick={() => excluirCategoria(cat.id)}
                    className="hidden text-ink-faint hover:text-warn group-hover:inline"
                  >
                    ×
                  </button>
                </span>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-ink-muted">Nenhuma categoria ainda.</p>
              )}
            </div>
          </section>

          {/* Lançamentos */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Lançamentos</h2>
              <button
                onClick={() => setMostrarFormLancamento((v) => !v)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
              >
                {mostrarFormLancamento ? "Cancelar" : "+ Novo lançamento"}
              </button>
            </div>

            {mostrarFormLancamento && (
              <form
                onSubmit={criarLancamento}
                className="mb-4 flex flex-col gap-3 rounded-xl border border-base-border bg-base-surface p-5"
              >
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo("expense")}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      tipo === "expense"
                        ? "border-warn bg-warn-dim text-warn"
                        : "border-base-border text-ink-muted"
                    }`}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("income")}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      tipo === "income"
                        ? "border-accent bg-accent-dim text-accent"
                        : "border-base-border text-ink-muted"
                    }`}
                  >
                    Receita
                  </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="Valor (ex: 49,90)"
                    inputMode="decimal"
                    className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:flex-1"
                    required
                  />
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">Sem categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição (opcional)"
                  className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />

                <button
                  type="submit"
                  disabled={salvando}
                  className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Salvar lançamento
                </button>
              </form>
            )}

            {transactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
                <p className="text-sm text-ink-muted">
                  Você ainda não tem lançamentos.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {transactions.slice(0, 30).map((t) => {
                  const cat = categories.find((c) => c.id === t.category_id);
                  return (
                    <li key={t.id}>
                      <SwipeRow
                        onEdit={() => {}}
                        onDelete={() => excluirLancamento(t.id)}
                      >
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: cat?.color ?? "#5A6172" }}
                            />
                            <div>
                              <p className="text-sm text-ink">
                                {t.description || cat?.name || "Lançamento"}
                              </p>
                              <p className="text-xs text-ink-faint">
                                {formatarDataCurta(t.date)}
                                {cat ? ` · ${cat.name}` : ""}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-sm font-semibold ${
                              t.type === "income" ? "text-accent" : "text-warn"
                            }`}
                          >
                            {t.type === "income" ? "+" : "−"}
                            {formatarMoeda(t.amount)}
                          </span>
                        </div>
                      </SwipeRow>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

function formatarDataCurta(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
