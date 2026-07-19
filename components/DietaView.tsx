"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { BodyMetrics, Meal, MealItem, Sex, ActivityLevel } from "@/types/database";
import {
  type AlimentoBase,
  buscarAlimentos,
  calcularMacrosPorQuantidade,
  extrairQuantidade,
} from "@/lib/alimentos";
import { MULTIPLICADORES, LABEL_ATIVIDADE, calcularTMB, calcularKcal } from "@/lib/nutricao";
import { useToast } from "@/components/ToastProvider";

const MSG_ERRO_PADRAO = "Não deu pra salvar agora. Tenta de novo em instantes.";

function hojeISO(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

type ItemFormState = {
  name: string;
  gramas: string;
  protein: string;
  carb: string;
  fat: string;
};

const ITEM_FORM_VAZIO: ItemFormState = { name: "", gramas: "", protein: "", carb: "", fat: "" };

export default function DietaView() {
  const supabase = createClient();
  const { mostrarToast } = useToast();
  const hoje = hojeISO();

  const [metrics, setMetrics] = useState<BodyMetrics | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [itemsPorRefeicao, setItemsPorRefeicao] = useState<Record<string, MealItem[]>>({});
  const [loading, setLoading] = useState(true);

  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [idade, setIdade] = useState("");
  const [sexo, setSexo] = useState<Sex>("m");
  const [atividade, setAtividade] = useState<ActivityLevel>("moderado");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  const [novaRefeicaoNome, setNovaRefeicaoNome] = useState("");
  const [mostrarFormRefeicao, setMostrarFormRefeicao] = useState(false);

  const [itemForm, setItemForm] = useState<Record<string, ItemFormState>>({});
  const [sugestoes, setSugestoes] = useState<Record<string, AlimentoBase[]>>({});
  const [sugestaoAberta, setSugestaoAberta] = useState<string | null>(null);
  const [alimentoSelecionado, setAlimentoSelecionado] = useState<Record<string, AlimentoBase | null>>({});

  const [itemEditando, setItemEditando] = useState<{
    id: string;
    mealId: string;
    name: string;
    protein: string;
    carb: string;
    fat: string;
  } | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: metricsData } = await supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: mealsData } = await supabase
      .from("meals")
      .select("*")
      .eq("date", hoje)
      .order("created_at", { ascending: true });

    const { data: itemsData } = await supabase
      .from("meal_items")
      .select("*")
      .order("created_at", { ascending: true });

    const mapa: Record<string, MealItem[]> = {};
    (itemsData as MealItem[] | null)?.forEach((item) => {
      if (!mapa[item.meal_id]) mapa[item.meal_id] = [];
      mapa[item.meal_id].push(item);
    });

    setMetrics((metricsData as BodyMetrics) ?? null);
    setMeals((mealsData as Meal[]) ?? []);
    setItemsPorRefeicao(mapa);
    setLoading(false);
  }, [supabase, hoje]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirEdicaoPerfil() {
    if (metrics) {
      setPeso(String(metrics.weight_kg));
      setAltura(String(metrics.height_cm));
      setIdade(String(metrics.age));
      setSexo(metrics.sex);
      setAtividade(metrics.activity_level);
    }
    setEditandoPerfil(true);
  }

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!peso || !altura || !idade) return;
    setSalvandoPerfil(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { error } = await supabase.from("body_metrics").upsert({
      user_id: userId,
      weight_kg: Number(peso),
      height_cm: Number(altura),
      age: Number(idade),
      sex: sexo,
      activity_level: atividade,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvandoPerfil(false);
      return;
    }

    setEditandoPerfil(false);
    setSalvandoPerfil(false);
    carregar();
  }

  async function criarRefeicao(e: React.FormEvent) {
    e.preventDefault();
    if (!novaRefeicaoNome.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { error } = await supabase.from("meals").insert({
      user_id: userId,
      date: hoje,
      name: novaRefeicaoNome.trim(),
    });

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }

    setNovaRefeicaoNome("");
    setMostrarFormRefeicao(false);
    carregar();
  }

  async function excluirRefeicao(mealId: string) {
    const { error } = await supabase.from("meals").delete().eq("id", mealId);
    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }
    carregar();
  }

  // Busca no banco local de alimentos enquanto o usuário digita o nome do
  // item. Se reconhecer o alimento (e a quantidade em gramas, quando
  // digitada junto, ex: "arroz branco 150g"), já preenche proteína,
  // carboidrato e gordura automaticamente.
  function lidarComNome(mealId: string, valor: string) {
    const formAtual = itemForm[mealId] ?? ITEM_FORM_VAZIO;
    const { termo, gramas: gramasDoTexto } = extrairQuantidade(valor);
    const resultados = termo.length >= 2 ? buscarAlimentos(termo) : [];

    setSugestoes((s) => ({ ...s, [mealId]: resultados }));
    setSugestaoAberta(resultados.length > 0 ? mealId : null);

    let gramas = formAtual.gramas;
    let protein = formAtual.protein;
    let carb = formAtual.carb;
    let fat = formAtual.fat;

    if (gramasDoTexto !== null) {
      gramas = String(gramasDoTexto);
    }

    if (resultados.length > 0) {
      const gramasParaCalculo = gramasDoTexto ?? (parseFloat(gramas) || 100);
      const macros = calcularMacrosPorQuantidade(resultados[0], gramasParaCalculo);
      protein = String(macros.protein_g);
      carb = String(macros.carb_g);
      fat = String(macros.fat_g);
      setAlimentoSelecionado((s) => ({ ...s, [mealId]: resultados[0] }));
    }

    setItemForm((atual) => ({
      ...atual,
      [mealId]: { name: valor, gramas, protein, carb, fat },
    }));
  }

  function selecionarSugestao(mealId: string, alimento: AlimentoBase) {
    const formAtual = itemForm[mealId] ?? ITEM_FORM_VAZIO;
    const gramas = parseFloat(formAtual.gramas) || 100;
    const macros = calcularMacrosPorQuantidade(alimento, gramas);

    setItemForm((atual) => ({
      ...atual,
      [mealId]: {
        name: alimento.nome,
        gramas: String(gramas),
        protein: String(macros.protein_g),
        carb: String(macros.carb_g),
        fat: String(macros.fat_g),
      },
    }));
    setAlimentoSelecionado((s) => ({ ...s, [mealId]: alimento }));
    setSugestoes((s) => ({ ...s, [mealId]: [] }));
    setSugestaoAberta(null);
  }

  function atualizarGramas(mealId: string, valor: string) {
    const formAtual = itemForm[mealId] ?? ITEM_FORM_VAZIO;
    const alimento = alimentoSelecionado[mealId];
    let protein = formAtual.protein;
    let carb = formAtual.carb;
    let fat = formAtual.fat;

    if (alimento) {
      const macros = calcularMacrosPorQuantidade(alimento, parseFloat(valor) || 0);
      protein = String(macros.protein_g);
      carb = String(macros.carb_g);
      fat = String(macros.fat_g);
    }

    setItemForm((atual) => ({
      ...atual,
      [mealId]: { ...formAtual, gramas: valor, protein, carb, fat },
    }));
  }

  function atualizarMacroManual(mealId: string, campo: "protein" | "carb" | "fat", valor: string) {
    // edição manual encerra o vínculo automático com o alimento selecionado,
    // pra não sobrescrever o ajuste do usuário se ele mudar a quantidade depois
    setAlimentoSelecionado((s) => ({ ...s, [mealId]: null }));
    setItemForm((atual) => ({
      ...atual,
      [mealId]: { ...(atual[mealId] ?? ITEM_FORM_VAZIO), [campo]: valor },
    }));
  }

  async function adicionarItem(mealId: string) {
    const form = itemForm[mealId];
    if (!form?.name.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { error } = await supabase.from("meal_items").insert({
      meal_id: mealId,
      user_id: userId,
      name: form.name.trim(),
      protein_g: Number(form.protein) || 0,
      carb_g: Number(form.carb) || 0,
      fat_g: Number(form.fat) || 0,
    });

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }

    setItemForm((atual) => ({ ...atual, [mealId]: ITEM_FORM_VAZIO }));
    setAlimentoSelecionado((s) => ({ ...s, [mealId]: null }));
    setSugestoes((s) => ({ ...s, [mealId]: [] }));
    carregar();
  }

  async function excluirItem(itemId: string) {
    const { error } = await supabase.from("meal_items").delete().eq("id", itemId);
    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }
    carregar();
  }

  function iniciarEdicaoItem(item: MealItem) {
    setItemEditando({
      id: item.id,
      mealId: item.meal_id,
      name: item.name,
      protein: String(item.protein_g),
      carb: String(item.carb_g),
      fat: String(item.fat_g),
    });
  }

  function cancelarEdicaoItem() {
    setItemEditando(null);
  }

  async function salvarEdicaoItem() {
    if (!itemEditando || !itemEditando.name.trim()) return;
    const { error } = await supabase
      .from("meal_items")
      .update({
        name: itemEditando.name.trim(),
        protein_g: Number(itemEditando.protein) || 0,
        carb_g: Number(itemEditando.carb) || 0,
        fat_g: Number(itemEditando.fat) || 0,
      })
      .eq("id", itemEditando.id);

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }
    setItemEditando(null);
    carregar();
  }

  const tmb = metrics ? calcularTMB(metrics) : null;
  const tdee = metrics && tmb ? tmb * MULTIPLICADORES[metrics.activity_level] : null;

  const totaisDia = useMemo(() => {
    let protein = 0, carb = 0, fat = 0;
    Object.values(itemsPorRefeicao).forEach((items) => {
      items.forEach((item) => {
        protein += item.protein_g;
        carb += item.carb_g;
        fat += item.fat_g;
      });
    });
    return { protein, carb, fat, kcal: calcularKcal(protein, carb, fat) };
  }, [itemsPorRefeicao]);

  const deficit = tdee !== null ? Math.round(totaisDia.kcal - tdee) : null;

  if (loading) {
    return <p className="text-sm text-ink-muted">Carregando...</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-base-border bg-base-surface p-4">
        {!metrics && !editandoPerfil ? (
          <div className="text-center">
            <p className="mb-3 text-sm text-ink-muted">
              Cadastre seu peso, altura, idade e nível de atividade pra calcular seu gasto calórico automaticamente.
            </p>
            <button
              onClick={abrirEdicaoPerfil}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
            >
              Configurar perfil
            </button>
          </div>
        ) : editandoPerfil ? (
          <form onSubmit={salvarPerfil} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="Peso (kg)"
                inputMode="decimal"
                className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                required
              />
              <input
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                placeholder="Altura (cm)"
                inputMode="decimal"
                className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                required
              />
              <input
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                placeholder="Idade"
                inputMode="numeric"
                className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                required
              />
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as Sex)}
                className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="m">Masculino</option>
                <option value="f">Feminino</option>
              </select>
            </div>
            <select
              value={atividade}
              onChange={(e) => setAtividade(e.target.value as ActivityLevel)}
              className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              {(Object.keys(LABEL_ATIVIDADE) as ActivityLevel[]).map((nivel) => (
                <option key={nivel} value={nivel}>
                  {LABEL_ATIVIDADE[nivel]}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={salvandoPerfil}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Salvar
              </button>
              {metrics && (
                <button
                  type="button"
                  onClick={() => setEditandoPerfil(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-ink-faint hover:text-ink"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-faint">Seu gasto calórico estimado (TDEE)</p>
              <p className="font-display text-2xl font-bold text-ink">{Math.round(tdee ?? 0)} kcal/dia</p>
              <p className="mt-0.5 text-xs text-ink-faint">TMB: {Math.round(tmb ?? 0)} kcal · {metrics ? LABEL_ATIVIDADE[metrics.activity_level] : ""}</p>
            </div>
            <button onClick={abrirEdicaoPerfil} className="text-sm font-medium text-accent hover:opacity-80">
              Editar
            </button>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Refeições de hoje</h2>
          <button
            onClick={() => setMostrarFormRefeicao((v) => !v)}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-base transition-opacity hover:opacity-90"
          >
            {mostrarFormRefeicao ? "Cancelar" : "+ Refeição"}
          </button>
        </div>

        {mostrarFormRefeicao && (
          <form
            onSubmit={criarRefeicao}
            className="mb-4 flex items-center gap-2 rounded-xl border border-base-border bg-base-surface p-3"
          >
            <input
              value={novaRefeicaoNome}
              onChange={(e) => setNovaRefeicaoNome(e.target.value)}
              placeholder="Ex: Café da manhã, Almoço, Jantar"
              className="flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              required
            />
            <button type="submit" className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-base">
              Criar
            </button>
          </form>
        )}

        {meals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-base-border p-6 text-center">
            <p className="text-sm text-ink-muted">Nenhuma refeição registrada hoje ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {meals.map((meal) => {
              const items = itemsPorRefeicao[meal.id] ?? [];
              const totalRefeicao = items.reduce(
                (acc, i) => acc + calcularKcal(i.protein_g, i.carb_g, i.fat_g),
                0
              );
              const form = itemForm[meal.id] ?? ITEM_FORM_VAZIO;
              const listaSugestoes = sugestoes[meal.id] ?? [];
              const kcalPreview = calcularKcal(
                Number(form.protein) || 0,
                Number(form.carb) || 0,
                Number(form.fat) || 0
              );

              return (
                <div key={meal.id} className="rounded-xl border border-base-border bg-base-surface p-4">
                  <div className="flex items-center justify-between px-1 py-1">
                    <h3 className="text-sm font-semibold text-ink">{meal.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-faint">{Math.round(totalRefeicao)} kcal</span>
                      <button
                        onClick={() => excluirRefeicao(meal.id)}
                        aria-label="Excluir refeição"
                        className="text-ink-faint hover:text-warn"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {items.map((item) =>
                        itemEditando?.id === item.id ? (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-center gap-1.5 rounded-lg border border-accent bg-base p-2"
                          >
                            <input
                              value={itemEditando.name}
                              onChange={(e) => setItemEditando({ ...itemEditando, name: e.target.value })}
                              autoFocus
                              className="min-w-[120px] flex-1 rounded-md border border-base-border bg-base-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                            />
                            <input
                              value={itemEditando.protein}
                              onChange={(e) => setItemEditando({ ...itemEditando, protein: e.target.value })}
                              placeholder="Prot(g)"
                              inputMode="decimal"
                              className="w-16 rounded-md border border-base-border bg-base-surface px-2 py-1.5 text-center text-xs text-ink outline-none focus:border-accent"
                            />
                            <input
                              value={itemEditando.carb}
                              onChange={(e) => setItemEditando({ ...itemEditando, carb: e.target.value })}
                              placeholder="Carb(g)"
                              inputMode="decimal"
                              className="w-16 rounded-md border border-base-border bg-base-surface px-2 py-1.5 text-center text-xs text-ink outline-none focus:border-accent"
                            />
                            <input
                              value={itemEditando.fat}
                              onChange={(e) => setItemEditando({ ...itemEditando, fat: e.target.value })}
                              placeholder="Gord(g)"
                              inputMode="decimal"
                              className="w-16 rounded-md border border-base-border bg-base-surface px-2 py-1.5 text-center text-xs text-ink outline-none focus:border-accent"
                            />
                            <button
                              onClick={salvarEdicaoItem}
                              className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-base"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={cancelarEdicaoItem}
                              className="text-xs text-ink-faint hover:text-ink"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="text-ink-muted">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-ink-faint">
                                P{item.protein_g} C{item.carb_g} G{item.fat_g}
                              </span>
                              <button
                                onClick={() => iniciarEdicaoItem(item)}
                                aria-label="Editar item"
                                className="text-ink-faint hover:text-accent"
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => excluirItem(item.id)}
                                aria-label="Excluir item"
                                className="text-ink-faint hover:text-warn"
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <div className="relative min-w-[140px] flex-1">
                      <input
                        value={form.name}
                        onChange={(e) => lidarComNome(meal.id, e.target.value)}
                        onFocus={() => listaSugestoes.length > 0 && setSugestaoAberta(meal.id)}
                        onBlur={() =>
                          setTimeout(
                            () => setSugestaoAberta((atual) => (atual === meal.id ? null : atual)),
                            150
                          )
                        }
                        placeholder="Ex: arroz branco 150g"
                        className="w-full rounded-md border border-base-border bg-base px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                        autoComplete="off"
                      />
                      {sugestaoAberta === meal.id && listaSugestoes.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-base-border bg-base-surface shadow-lg">
                          {listaSugestoes.map((alimento) => (
                            <button
                              key={alimento.nome}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selecionarSugestao(meal.id, alimento)}
                              className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs text-ink hover:bg-base"
                            >
                              <span>{alimento.nome}</span>
                              <span className="text-ink-faint">{alimento.kcal} kcal/100g</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      value={form.gramas}
                      onChange={(e) => atualizarGramas(meal.id, e.target.value)}
                      placeholder="Gramas"
                      inputMode="decimal"
                      className="w-16 rounded-md border border-base-border bg-base px-2 py-1.5 text-center text-xs text-ink outline-none focus:border-accent"
                    />
                    <input
                      value={form.protein}
                      onChange={(e) => atualizarMacroManual(meal.id, "protein", e.target.value)}
                      placeholder="Prot(g)"
                      inputMode="decimal"
                      className="w-16 rounded-md border border-base-border bg-base px-2 py-1.5 text-center text-xs text-ink outline-none focus:border-accent"
                    />
                    <input
                      value={form.carb}
                      onChange={(e) => atualizarMacroManual(meal.id, "carb", e.target.value)}
                      placeholder="Carb(g)"
                      inputMode="decimal"
                      className="w-16 rounded-md border border-base-border bg-base px-2 py-1.5 text-center text-xs text-ink outline-none focus:border-accent"
                    />
                    <input
                      value={form.fat}
                      onChange={(e) => atualizarMacroManual(meal.id, "fat", e.target.value)}
                      placeholder="Gord(g)"
                      inputMode="decimal"
                      className="w-16 rounded-md border border-base-border bg-base px-2 py-1.5 text-center text-xs text-ink outline-none focus:border-accent"
                    />
                    <button
                      onClick={() => adicionarItem(meal.id)}
                      className="rounded-md bg-ink px-2.5 py-1.5 text-xs font-semibold text-base"
                    >
                      + Item
                    </button>
                  </div>
                  {(form.protein || form.carb || form.fat) && (
                    <p className="mt-1 text-right text-[10px] text-ink-faint">≈ {Math.round(kcalPreview)} kcal</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {meals.length > 0 && (
        <section className="rounded-xl border border-base-border bg-base-surface p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Totais do dia</h2>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="font-display text-base font-bold text-accent">{Math.round(totaisDia.protein)}g</p>
              <p className="text-[10px] text-ink-faint">Proteína</p>
            </div>
            <div>
              <p className="font-display text-base font-bold text-ink">{Math.round(totaisDia.carb)}g</p>
              <p className="text-[10px] text-ink-faint">Carbo</p>
            </div>
            <div>
              <p className="font-display text-base font-bold text-warn">{Math.round(totaisDia.fat)}g</p>
              <p className="text-[10px] text-ink-faint">Gordura</p>
            </div>
            <div>
              <p className="font-display text-base font-bold text-ink">{Math.round(totaisDia.kcal)}</p>
              <p className="text-[10px] text-ink-faint">kcal</p>
            </div>
          </div>

          {deficit !== null && (
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                deficit <= 0 ? "bg-accent-dim text-accent" : "bg-warn-dim text-warn"
              }`}
            >
              {deficit <= 0 ? "Déficit calórico" : "Superávit calórico"}: {deficit > 0 ? "+" : ""}
              {deficit} kcal
            </div>
          )}
          <p className="mt-1.5 text-center text-[10px] text-ink-faint">
            Estimativa baseada em macros e no seu gasto total (TDEE).
          </p>
        </section>
      )}
    </div>
  );
}
