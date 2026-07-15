"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import SwipeRow from "@/components/SwipeRow";
import type { Goal, GoalStatus, GoalCategory, GoalItem } from "@/types/database";

const CORES = ["#E5E5E3", "#C7C7C5", "#B0B0AD", "#8A8F98", "#71717A", "#3A3A3D"];

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_LABEL: Record<GoalStatus, string> = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  done: "Concluída",
};

const STATUS_COLOR: Record<GoalStatus, string> = {
  not_started: "#57575B",
  in_progress: "#C7C7C5",
  done: "#E5E5E3",
};

const STATUS_ORDER: GoalStatus[] = ["in_progress", "not_started", "done"];

export default function MetasPage() {
  const supabase = createClient();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<GoalCategory[]>([]);
  const [items, setItems] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [novoItemTexto, setNovoItemTexto] = useState<Record<string, string>>({});
  const [itensNovaMeta, setItensNovaMeta] = useState("");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [imagemArquivo, setImagemArquivo] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string>("");
  const [enviandoImagem, setEnviandoImagem] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editPrazo, setEditPrazo] = useState("");
  const [editCategoriaId, setEditCategoriaId] = useState("");
  const [editValorAlvo, setEditValorAlvo] = useState("");
  const [editImagemUrl, setEditImagemUrl] = useState("");
  const [editImagemArquivo, setEditImagemArquivo] = useState<File | null>(null);
  const [editImagemPreview, setEditImagemPreview] = useState<string>("");

  const [valorGuardar, setValorGuardar] = useState<Record<string, string>>({});

  const [visao, setVisao] = useState<"lista" | "sonhos">("lista");

  const [mostrarFormCategoria, setMostrarFormCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<string | null>(null);
  const [editCategoriaNome, setEditCategoriaNome] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: cats } = await supabase
      .from("goal_categories")
      .select("*")
      .order("created_at", { ascending: true });
    const { data: goalItems } = await supabase
      .from("goal_items")
      .select("*")
      .order("position", { ascending: true });

    setGoals((data as Goal[]) ?? []);
    setCategories((cats as GoalCategory[]) ?? []);
    setItems((goalItems as GoalItem[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function enviarImagemMeta(file: File, userId: string): Promise<string | null> {
    const ext = file.name.split(".").pop() || "jpg";
    const nomeArquivo = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("goal-images")
      .upload(nomeArquivo, file, { cacheControl: "3600", upsert: false });
    if (error) {
      console.error("Erro ao enviar imagem:", error.message);
      return null;
    }
    const { data } = supabase.storage.from("goal-images").getPublicUrl(nomeArquivo);
    return data.publicUrl;
  }

  function handleImagemChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImagemArquivo(file);
    setImagemPreview(file ? URL.createObjectURL(file) : "");
  }

  function handleEditImagemChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setEditImagemArquivo(file);
    setEditImagemPreview(file ? URL.createObjectURL(file) : "");
  }

  async function criarMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    let urlImagem: string | null = null;
    if (imagemArquivo) {
      setEnviandoImagem(true);
      urlImagem = await enviarImagemMeta(imagemArquivo, userId);
      setEnviandoImagem(false);
    }

    const valorAlvoNum = parseFloat(valorAlvo.replace(",", "."));

    const { data: novaMeta } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: titulo.trim(),
        description: descricao.trim() || null,
        deadline: prazo || null,
        category_id: categoriaId || null,
        image_url: urlImagem,
        target_amount: valorAlvoNum > 0 ? valorAlvoNum : null,
        current_amount: 0,
        status: "not_started",
      })
      .select()
      .single();

    const linhas = itensNovaMeta
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (novaMeta && linhas.length > 0) {
      await supabase.from("goal_items").insert(
        linhas.map((content, i) => ({
          goal_id: novaMeta.id,
          user_id: userId,
          content,
          position: i,
        }))
      );
    }

    setTitulo("");
    setDescricao("");
    setPrazo("");
    setCategoriaId("");
    setValorAlvo("");
    setImagemArquivo(null);
    setImagemPreview("");
    setItensNovaMeta("");
    setMostrarForm(false);
    setSalvando(false);
    carregar();
  }

  async function adicionarItem(goalId: string) {
    const texto = (novoItemTexto[goalId] || "").trim();
    if (!texto) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const itensDaMeta = items.filter((i) => i.goal_id === goalId);
    const proximaPosicao = itensDaMeta.length;

    await supabase.from("goal_items").insert({
      goal_id: goalId,
      user_id: userId,
      content: texto,
      position: proximaPosicao,
    });

    setNovoItemTexto((prev) => ({ ...prev, [goalId]: "" }));
    carregar();
  }

  async function alternarItem(item: GoalItem) {
    const novoDone = !item.done;
    const novosItems = items.map((i) =>
      i.id === item.id ? { ...i, done: novoDone } : i
    );
    setItems(novosItems);
    await supabase.from("goal_items").update({ done: novoDone }).eq("id", item.id);

    const itensDaMeta = novosItems.filter((i) => i.goal_id === item.goal_id);
    const meta = goals.find((g) => g.id === item.goal_id);
    if (itensDaMeta.length > 0 && meta) {
      const todosFeitos = itensDaMeta.every((i) => i.done);
      if (todosFeitos && meta.status !== "done") {
        mudarStatus(item.goal_id, "done");
      } else if (!todosFeitos && meta.status === "done") {
        mudarStatus(item.goal_id, "in_progress");
      }
    }
  }

  async function excluirItem(item: GoalItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await supabase.from("goal_items").delete().eq("id", item.id);
  }

  function iniciarEdicao(goal: Goal) {
    setEditandoId(goal.id);
    setEditTitulo(goal.title);
    setEditDescricao(goal.description ?? "");
    setEditPrazo(goal.deadline ?? "");
    setEditCategoriaId(goal.category_id ?? "");
    setEditValorAlvo(goal.target_amount ? String(goal.target_amount) : "");
    setEditImagemUrl(goal.image_url ?? "");
    setEditImagemArquivo(null);
    setEditImagemPreview("");
  }

  async function salvarEdicao(goalId: string) {
    if (!editTitulo.trim()) return;

    let urlImagem = editImagemUrl || null;
    if (editImagemArquivo) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (userId) {
        setEnviandoImagem(true);
        const novaUrl = await enviarImagemMeta(editImagemArquivo, userId);
        setEnviandoImagem(false);
        if (novaUrl) urlImagem = novaUrl;
      }
    }

    const valorAlvoNum = parseFloat(editValorAlvo.replace(",", "."));

    await supabase
      .from("goals")
      .update({
        title: editTitulo.trim(),
        description: editDescricao.trim() || null,
        deadline: editPrazo || null,
        category_id: editCategoriaId || null,
        target_amount: valorAlvoNum > 0 ? valorAlvoNum : null,
        image_url: urlImagem,
      })
      .eq("id", goalId);

    setEditandoId(null);
    setEditImagemArquivo(null);
    setEditImagemPreview("");
    carregar();
  }

  async function guardarDinheiro(goal: Goal) {
    const bruto = (valorGuardar[goal.id] || "").replace(",", ".");
    const valor = parseFloat(bruto);
    if (!valor || valor <= 0) return;

    const novoValor = Number((Number(goal.current_amount || 0) + valor).toFixed(2));

    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, current_amount: novoValor } : g))
    );
    setValorGuardar((prev) => ({ ...prev, [goal.id]: "" }));

    await supabase.from("goals").update({ current_amount: novoValor }).eq("id", goal.id);
  }

  async function mudarStatus(goalId: string, status: GoalStatus) {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, status } : g))
    );
    await supabase.from("goals").update({ status }).eq("id", goalId);
  }

  async function excluirMeta(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    await supabase.from("goals").delete().eq("id", goalId);
  }

  async function criarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!novaCategoriaNome.trim()) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const cor = CORES[categories.length % CORES.length];

    await supabase.from("goal_categories").insert({
      user_id: userId,
      name: novaCategoriaNome.trim(),
      color: cor,
    });

    setNovaCategoriaNome("");
    setMostrarFormCategoria(false);
    setSalvando(false);
    carregar();
  }

  function iniciarEdicaoCategoria(cat: GoalCategory) {
    setEditandoCategoriaId(cat.id);
    setEditCategoriaNome(cat.name);
  }

  async function salvarEdicaoCategoria(categoriaId: string) {
    if (!editCategoriaNome.trim()) return;
    await supabase
      .from("goal_categories")
      .update({ name: editCategoriaNome.trim() })
      .eq("id", categoriaId);
    setEditandoCategoriaId(null);
    carregar();
  }

  async function excluirCategoria(categoriaId: string) {
    await supabase.from("goal_categories").delete().eq("id", categoriaId);
    carregar();
  }

  const goalsOrdenadas = [...goals].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Metas</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Seus objetivos de longo prazo.
        </p>
      </header>

      <div className="mb-6 flex w-fit rounded-lg border border-base-border p-1">
        <button
          onClick={() => setVisao("lista")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            visao === "lista" ? "bg-ink text-base" : "text-ink-muted hover:text-ink"
          }`}
        >
          Lista
        </button>
        <button
          onClick={() => setVisao("sonhos")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            visao === "sonhos" ? "bg-ink text-base" : "text-ink-muted hover:text-ink"
          }`}
        >
          Painel de Sonhos
        </button>
      </div>

      {visao === "sonhos" && (
        <p className="mb-6 font-display text-base italic text-ink-muted">
          Aquilo que você mantém diante dos olhos, você caminha até alcançar.
        </p>
      )}

      {visao === "lista" && (
      <>
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
              placeholder="Ex: Carreira, Pessoal, Financeiro"
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

      {/* Nova meta */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Suas metas</h2>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          {mostrarForm ? "Cancelar" : "+ Nova meta"}
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={criarMeta}
          className="mb-6 flex flex-col gap-3 rounded-xl border border-base-border bg-base-surface p-5"
        >
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título da meta, ex: Validar minha primeira ideia de negócio"
            className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição (opcional) — detalhe o que essa meta significa pra você"
            rows={3}
            className="resize-none rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <textarea
            value={itensNovaMeta}
            onChange={(e) => setItensNovaMeta(e.target.value)}
            placeholder={"Tópicos/tarefas (opcional) — um por linha, ex:\nLavar louça\nTrocar óleo da moto\nLavar o quintal"}
            rows={3}
            className="resize-none rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <div>
            <label className="mb-1 block text-xs text-ink-muted">
              Foto do sonho (opcional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImagemChange}
              className="block w-full text-xs text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-semibold file:text-base"
            />
            {imagemPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagemPreview}
                alt="Pré-visualização"
                className="mt-2 h-28 w-28 rounded-lg object-cover"
              />
            )}
            <p className="mt-1 text-xs text-ink-faint">Aparece no Painel de Sonhos.</p>
          </div>
          <div>
            <input
              value={valorAlvo}
              onChange={(e) => setValorAlvo(e.target.value)}
              placeholder="Valor alvo em R$ (opcional) — se essa meta envolve guardar dinheiro"
              inputMode="decimal"
              className="w-full rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-ink-faint">
              Se preenchido, a meta ganha uma barra de progresso alimentada por
              dinheiro guardado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-ink-muted">Prazo (opcional):</label>
            <input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={salvando || enviandoImagem}
            className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {enviandoImagem ? "Enviando foto..." : "Salvar meta"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : goalsOrdenadas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
          <p className="text-sm text-ink-muted">
            Você ainda não tem metas cadastradas.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {goalsOrdenadas.map((goal) => {
            const cat = categories.find((c) => c.id === goal.category_id);

            if (editandoId === goal.id) {
              return (
                <li
                  key={goal.id}
                  className="rounded-xl border border-accent bg-base-surface p-4"
                >
                  <div className="flex flex-col gap-3">
                    <input
                      value={editTitulo}
                      onChange={(e) => setEditTitulo(e.target.value)}
                      autoFocus
                      className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                    <textarea
                      value={editDescricao}
                      onChange={(e) => setEditDescricao(e.target.value)}
                      rows={2}
                      placeholder="Descrição (opcional)"
                      className="resize-none rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                    <div>
                      <label className="mb-1 block text-xs text-ink-muted">
                        Foto do sonho
                      </label>
                      {(editImagemPreview || editImagemUrl) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={editImagemPreview || editImagemUrl}
                          alt="Foto atual"
                          className="mb-2 h-24 w-24 rounded-lg object-cover"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditImagemChange}
                        className="block w-full text-xs text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-semibold file:text-base"
                      />
                      <p className="mt-1 text-xs text-ink-faint">
                        Escolha um arquivo só se quiser trocar a foto atual.
                      </p>
                    </div>
                    <input
                      value={editValorAlvo}
                      onChange={(e) => setEditValorAlvo(e.target.value)}
                      placeholder="Valor alvo em R$ (opcional)"
                      inputMode="decimal"
                      className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="date"
                        value={editPrazo}
                        onChange={(e) => setEditPrazo(e.target.value)}
                        className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                      />
                      <select
                        value={editCategoriaId}
                        onChange={(e) => setEditCategoriaId(e.target.value)}
                        className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                      >
                        <option value="">Sem categoria</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => salvarEdicao(goal.id)}
                        disabled={enviandoImagem}
                        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base disabled:opacity-50"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="text-sm text-ink-faint hover:text-ink"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </li>
              );
            }

            return (
              <li key={goal.id}>
                <SwipeRow
                  onEdit={() => iniciarEdicao(goal)}
                  onDelete={() => excluirMeta(goal.id)}
                >
                  <div className="p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {cat && (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                        <h3
                          className={`text-sm font-semibold ${
                            goal.status === "done"
                              ? "text-ink-muted line-through"
                              : "text-ink"
                          }`}
                        >
                          {goal.title}
                        </h3>
                      </div>
                      {cat && (
                        <p className="mt-1 text-xs text-ink-faint">{cat.name}</p>
                      )}
                      {goal.description && (
                        <p className="mt-1 text-sm text-ink-muted">
                          {goal.description}
                        </p>
                      )}
                      {goal.deadline && (
                        <p className="mt-2 text-xs text-ink-faint">
                          Prazo: {formatarData(goal.deadline)}
                        </p>
                      )}

                      {goal.target_amount != null && (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-xs text-ink-faint">
                            <span>
                              {formatarMoeda(goal.current_amount)} / {formatarMoeda(goal.target_amount)}
                            </span>
                            <span>
                              {Math.min(
                                100,
                                Math.round((goal.current_amount / goal.target_amount) * 100)
                              )}
                              %
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-base">
                            <div
                              className="h-full rounded-full bg-accent transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (goal.current_amount / goal.target_amount) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={valorGuardar[goal.id] || ""}
                              onChange={(e) =>
                                setValorGuardar((prev) => ({
                                  ...prev,
                                  [goal.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  guardarDinheiro(goal);
                                }
                              }}
                              placeholder="Quanto você guardou agora?"
                              inputMode="decimal"
                              className="flex-1 rounded-lg border border-base-border bg-base px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                            />
                            <button
                              type="button"
                              onClick={() => guardarDinheiro(goal)}
                              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-base transition-opacity hover:opacity-90"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      )}

                      {(() => {
                        const itensDaMeta = items
                          .filter((i) => i.goal_id === goal.id)
                          .sort((a, b) => a.position - b.position);
                        return (
                          <div className="mt-3 flex flex-col gap-1.5">
                            {itensDaMeta.map((item) => (
                              <div
                                key={item.id}
                                className="group flex items-center gap-2"
                              >
                                <button
                                  type="button"
                                  onClick={() => alternarItem(item)}
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                                    item.done
                                      ? "border-accent bg-accent text-base"
                                      : "border-base-border text-transparent hover:border-accent"
                                  }`}
                                >
                                  ✓
                                </button>
                                <span
                                  className={`flex-1 text-sm ${
                                    item.done
                                      ? "text-ink-faint line-through"
                                      : "text-ink-muted"
                                  }`}
                                >
                                  {item.content}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => excluirItem(item)}
                                  className="hidden text-xs text-ink-faint hover:text-warn group-hover:inline"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                value={novoItemTexto[goal.id] || ""}
                                onChange={(e) =>
                                  setNovoItemTexto((prev) => ({
                                    ...prev,
                                    [goal.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    adicionarItem(goal.id);
                                  }
                                }}
                                placeholder="+ Adicionar tópico"
                                className="flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 text-xs text-ink outline-none focus:border-base-border"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-3 flex gap-1.5">
                      {(["not_started", "in_progress", "done"] as GoalStatus[]).map(
                        (status) => (
                          <button
                            key={status}
                            onClick={() => mudarStatus(goal.id, status)}
                            className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor:
                                goal.status === status
                                  ? `${STATUS_COLOR[status]}26`
                                  : "transparent",
                              color:
                                goal.status === status
                                  ? STATUS_COLOR[status]
                                  : "#57575B",
                              border: `1px solid ${
                                goal.status === status
                                  ? STATUS_COLOR[status]
                                  : "#2A2A2D"
                              }`,
                            }}
                          >
                            {STATUS_LABEL[status]}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </SwipeRow>
              </li>
            );
          })}
        </ul>
      )}
      </>
      )}

      {visao === "sonhos" && (
        goalsOrdenadas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
            <p className="text-sm text-ink-muted">
              Nenhum sonho no painel ainda. Volte pra "Lista" e adicione uma
              imagem às suas metas pra elas aparecerem aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {goalsOrdenadas.map((goal) => {
              const cat = categories.find((c) => c.id === goal.category_id);
              return (
                <button
                  key={goal.id}
                  onClick={() => {
                    setVisao("lista");
                    iniciarEdicao(goal);
                  }}
                  className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-base-border bg-base-surface text-left"
                >
                  {goal.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={goal.image_url}
                      alt={goal.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-base p-4">
                      <span className="text-center text-xs text-ink-faint">
                        {goal.title}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-10">
                    {cat && (
                      <span className="mb-1 inline-block rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                        {cat.name}
                      </span>
                    )}
                    <p className="line-clamp-2 text-sm font-semibold text-white">
                      {goal.title}
                    </p>
                    {goal.target_amount != null && (
                      <div className="mt-1.5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{
                              width: `${Math.min(
                                100,
                                (goal.current_amount / goal.target_amount) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-white/80">
                          {formatarMoeda(goal.current_amount)} / {formatarMoeda(goal.target_amount)}
                        </p>
                      </div>
                    )}
                    {goal.status === "done" && (
                      <span className="mt-1 inline-block text-[10px] font-semibold text-white/80">
                        ✓ Concluída
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}
    </AppShell>
  );
}

function formatarData(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
