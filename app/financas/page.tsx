"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import type {
  Category,
  Transaction,
  TransactionType,
  Goal,
} from "@/types/database";
import { CORES_CATEGORIA } from "@/lib/cores";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { adicionarMeses, estaAtrasada, hojeISO } from "@/lib/financas-utils";
import ResumoCards from "@/components/financas/ResumoCards";
import GraficosFinancas from "@/components/financas/GraficosFinancas";
import SecaoPoupanca from "@/components/financas/SecaoPoupanca";
import SecaoCategorias from "@/components/financas/SecaoCategorias";
import SecaoLancamentos from "@/components/financas/SecaoLancamentos";
import SecaoPlanejamento from "@/components/financas/SecaoPlanejamento";

const MSG_ERRO_PADRAO = "Não deu pra salvar agora. Tenta de novo em instantes.";
const MSG_ERRO_CARREGAR = "Alguns dados podem não ter carregado. Puxa a tela pra atualizar.";

type MetaVinculavel = Pick<Goal, "id" | "title" | "target_amount" | "current_amount">;

const LANCAMENTOS_POR_PAGINA = 50;

export default function FinancasPage() {
  const supabase = createClient();
  const { mostrarToast } = useToast();
  const confirmar = useConfirm();

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
  const [valorPoupanca, setValorPoupanca] = useState<Record<string, string>>({});
  const [enviandoPoupancaId, setEnviandoPoupancaId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    let houveErro = false;

    const { data: t, error: erroT } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });
    if (erroT) houveErro = true;

    const { data: c, error: erroC } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });
    if (erroC) houveErro = true;

    const { data: g, error: erroG } = await supabase
      .from("goals")
      .select("id, title, target_amount, current_amount")
      .not("target_amount", "is", null)
      .order("created_at", { ascending: false });
    if (erroG) houveErro = true;

    setTransactions((t as Transaction[]) ?? []);
    setCategories((c as Category[]) ?? []);
    setMetasVinculaveis((g as MetaVinculavel[]) ?? []);
    setLoading(false);

    if (houveErro) {
      mostrarToast(MSG_ERRO_CARREGAR);
    }
  }, [supabase, mostrarToast]);

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

  async function encontrarOuCriarCategoriaDaMeta(
    goalId: string,
    goalTitle: string,
    userId: string
  ): Promise<string> {
    const existente = categories.find((c) => c.linked_goal_id === goalId);
    if (existente) return existente.id;

    const cor = CORES_CATEGORIA[categories.length % CORES_CATEGORIA.length];
    const { data: novaCategoria, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: `Poupança · ${goalTitle}`,
        color: cor,
        linked_goal_id: goalId,
      })
      .select()
      .single();

    if (error || !novaCategoria) {
      throw new Error("Não foi possível criar a categoria de poupança para essa meta.");
    }

    return novaCategoria.id;
  }

  async function guardarNaPoupanca(goal: MetaVinculavel) {
    const bruto = (valorPoupanca[goal.id] || "").replace(",", ".");
    const valorNum = parseFloat(bruto);
    if (!valorNum || valorNum <= 0) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }

    setEnviandoPoupancaId(goal.id);

    try {
      const categoriaId = await encontrarOuCriarCategoriaDaMeta(goal.id, goal.title, userId);

      const { error } = await supabase.rpc("fn_guardar_poupanca", {
        p_goal_id: goal.id,
        p_valor: valorNum,
        p_category_id: categoriaId,
        p_descricao: `Guardado para "${goal.title}"`,
      });

      if (error) throw error;

      setValorPoupanca((prev) => ({ ...prev, [goal.id]: "" }));
      setPaginaAtual(1);
      carregar();
    } catch (err) {
      console.error("Erro ao guardar na poupança:", err);
      mostrarToast("Não deu pra guardar esse valor agora. Tenta de novo em instantes.");
    } finally {
      setEnviandoPoupancaId(null);
    }
  }

  async function salvarLancamento(e: React.FormEvent) {
    e.preventDefault();
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!valorNum || valorNum <= 0) return;
    setSalvando(true);

    if (editandoTransacao) {
      let error: { message: string } | null = null;

      if (aplicarEmTodasParcelas && editandoTransacao.recurrence_group_id) {
        const parcelasDoGrupo = transactions.filter(
          (t) => t.recurrence_group_id === editandoTransacao.recurrence_group_id
        );
        const totalAntigo = parcelasDoGrupo.reduce((s, t) => s + t.amount, 0);

        ({ error } = await supabase.rpc("fn_editar_lancamento_grupo", {
          p_recurrence_group_id: editandoTransacao.recurrence_group_id,
          p_type: tipo,
          p_amount: valorNum,
          p_category_id: categoriaId || null,
          p_description: descricao.trim() || null,
          p_old_category_id: editandoTransacao.category_id,
          p_old_total: totalAntigo,
        }));
      } else if (!editandoTransacao.recurrence_group_id && repetir) {
        const qtdParcelas = Math.max(2, parseInt(totalParcelas, 10) || 2);
        const datas = Array.from({ length: qtdParcelas }).map((_, i) => adicionarMeses(data, i));

        ({ error } = await supabase.rpc("fn_editar_lancamento_recorrente", {
          p_transaction_id: editandoTransacao.id,
          p_type: tipo,
          p_amount: valorNum,
          p_category_id: categoriaId || null,
          p_description: descricao.trim() || null,
          p_dates: datas,
          p_old_category_id: editandoTransacao.category_id,
          p_old_amount: editandoTransacao.amount,
        }));
      } else {
        ({ error } = await supabase.rpc("fn_editar_lancamento_simples", {
          p_transaction_id: editandoTransacao.id,
          p_type: tipo,
          p_amount: valorNum,
          p_category_id: categoriaId || null,
          p_description: descricao.trim() || null,
          p_date: data,
          p_old_category_id: editandoTransacao.category_id,
          p_old_amount: editandoTransacao.amount,
        }));
      }

      if (error) {
        mostrarToast(MSG_ERRO_PADRAO);
        setSalvando(false);
        return;
      }

      resetFormLancamento();
      setSalvando(false);
      carregar();
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvando(false);
      return;
    }

    const qtdParcelas = repetir ? Math.max(2, parseInt(totalParcelas, 10) || 2) : 1;
    const datas = Array.from({ length: qtdParcelas }).map((_, i) => adicionarMeses(data, i));

    const { error } = await supabase.rpc("fn_criar_lancamento", {
      p_type: tipo,
      p_amount: valorNum,
      p_category_id: categoriaId || null,
      p_description: descricao.trim() || null,
      p_dates: datas,
    });

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvando(false);
      return;
    }

    resetFormLancamento();
    setPaginaAtual(1);
    setSalvando(false);
    carregar();
  }

  async function excluirLancamento(t: Transaction) {
    if (t.recurrence_group_id) {
      const apagarTodas = await confirmar({
        titulo: "Apagar parcelas",
        mensagem:
          "Esse lançamento faz parte de uma recorrência/parcelamento. Apagar todas as parcelas, ou só esta?",
        textoConfirmar: "Apagar todas",
        textoCancelar: "Apagar só esta",
        destrutivo: true,
      });
      if (apagarTodas) {
        const parcelasDoGrupo = transactions.filter(
          (tx) => tx.recurrence_group_id === t.recurrence_group_id
        );
        const totalGrupo = parcelasDoGrupo.reduce((s, tx) => s + tx.amount, 0);

        setTransactions((prev) =>
          prev.filter((tx) => tx.recurrence_group_id !== t.recurrence_group_id)
        );

        const { error } = await supabase.rpc("fn_excluir_lancamento_grupo", {
          p_recurrence_group_id: t.recurrence_group_id,
          p_category_id: t.category_id,
          p_total: totalGrupo,
        });

        if (error) {
          mostrarToast(MSG_ERRO_PADRAO);
          carregar();
        }
        return;
      }
    }

    setTransactions((prev) => prev.filter((tx) => tx.id !== t.id));

    const { error } = await supabase.rpc("fn_excluir_lancamento_simples", {
      p_transaction_id: t.id,
      p_category_id: t.category_id,
      p_amount: t.amount,
    });

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      carregar();
    }
  }

  async function alternarPago(t: Transaction) {
    const novoPago = !t.paid;
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === t.id ? { ...tx, paid: novoPago } : tx))
    );
    const { error } = await supabase
      .from("transactions")
      .update({ paid: novoPago })
      .eq("id", t.id);

    if (error) {
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === t.id ? { ...tx, paid: t.paid } : tx))
      );
      mostrarToast(MSG_ERRO_PADRAO);
    }
  }

  async function criarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvando(false);
      return;
    }

    const cor = CORES_CATEGORIA[categories.length % CORES_CATEGORIA.length];

    const { error } = await supabase.from("categories").insert({
      user_id: userId,
      name: novaCategoria.trim(),
      color: cor,
      linked_goal_id: novaCategoriaMetaId || null,
    });

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvando(false);
      return;
    }

    setNovaCategoria("");
    setNovaCategoriaMetaId("");
    setMostrarFormCategoria(false);
    setSalvando(false);
    carregar();
  }

  async function excluirCategoria(id: string) {
    const categoriaRemovida = categories.find((c) => c.id === id) ?? null;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      if (categoriaRemovida) setCategories((prev) => [...prev, categoriaRemovida]);
      mostrarToast(MSG_ERRO_PADRAO);
    }
  }

  async function vincularCategoriaAMeta(categoryId: string, goalId: string) {
    const anterior = categories.find((c) => c.id === categoryId)?.linked_goal_id ?? null;
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, linked_goal_id: goalId || null } : c))
    );
    const { error } = await supabase
      .from("categories")
      .update({ linked_goal_id: goalId || null })
      .eq("id", categoryId);

    if (error) {
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, linked_goal_id: anterior } : c))
      );
      mostrarToast(MSG_ERRO_PADRAO);
    }
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
          <ResumoCards saldoDevedor={saldoDevedor} receitasMes={receitasMes} despesasMes={despesasMes} />

          <GraficosFinancas dadosPizza={dadosPizza} dadosLinha={dadosLinha} />

          <SecaoPoupanca
            metasVinculaveis={metasVinculaveis}
            valorPoupanca={valorPoupanca}
            setValorPoupanca={setValorPoupanca}
            enviandoPoupancaId={enviandoPoupancaId}
            guardarNaPoupanca={guardarNaPoupanca}
          />

          <SecaoCategorias
            categories={categories}
            metasVinculaveis={metasVinculaveis}
            mostrarFormCategoria={mostrarFormCategoria}
            setMostrarFormCategoria={setMostrarFormCategoria}
            novaCategoria={novaCategoria}
            setNovaCategoria={setNovaCategoria}
            novaCategoriaMetaId={novaCategoriaMetaId}
            setNovaCategoriaMetaId={setNovaCategoriaMetaId}
            salvando={salvando}
            criarCategoria={criarCategoria}
            excluirCategoria={excluirCategoria}
            vincularCategoriaAMeta={vincularCategoriaAMeta}
          />

          <SecaoLancamentos
            categories={categories}
            historicoLancamentos={historicoLancamentos}
            lancamentosVisiveis={lancamentosVisiveis}
            contasAtrasadas={contasAtrasadas}
            temMais={temMais}
            totalExibidos={totalExibidos}
            mostrarFormLancamento={mostrarFormLancamento}
            setMostrarFormLancamento={setMostrarFormLancamento}
            setPaginaAtual={setPaginaAtual}
            tipo={tipo}
            setTipo={setTipo}
            valor={valor}
            setValor={setValor}
            categoriaId={categoriaId}
            setCategoriaId={setCategoriaId}
            descricao={descricao}
            setDescricao={setDescricao}
            data={data}
            setData={setData}
            repetir={repetir}
            setRepetir={setRepetir}
            totalParcelas={totalParcelas}
            setTotalParcelas={setTotalParcelas}
            editandoId={editandoId}
            editandoTransacao={editandoTransacao}
            aplicarEmTodasParcelas={aplicarEmTodasParcelas}
            setAplicarEmTodasParcelas={setAplicarEmTodasParcelas}
            salvando={salvando}
            salvarLancamento={salvarLancamento}
            cancelarEdicao={cancelarEdicao}
            resetFormLancamento={resetFormLancamento}
            iniciarEdicao={iniciarEdicao}
            excluirLancamento={excluirLancamento}
            alternarPago={alternarPago}
          />

          <SecaoPlanejamento
            planejamento={planejamento}
            categories={categories}
            mesPlanejamentoAberto={mesPlanejamentoAberto}
            setMesPlanejamentoAberto={setMesPlanejamentoAberto}
          />
        </>
      )}
    </AppShell>
  );
}
