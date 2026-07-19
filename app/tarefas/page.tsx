"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import SwipeRow from "@/components/SwipeRow";
import type { Task } from "@/types/database";
import { useToast } from "@/components/ToastProvider";

const MSG_ERRO_PADRAO = "Não deu pra salvar agora. Tenta de novo em instantes.";

type Visao = "hoje" | "semana";

function hojeISO(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function fimDaSemanaISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia);
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  return `${String(dia).padStart(2, "0")} ${meses[mes - 1]}`;
}

export default function TarefasPage() {
  const supabase = createClient();
  const { mostrarToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [visao, setVisao] = useState<Visao>("hoje");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoPrazo, setNovoPrazo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editPrazo, setEditPrazo] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    setTasks((data as Task[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function criarTarefa(e: React.FormEvent) {
    e.preventDefault();
    if (!novoTitulo.trim()) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      title: novoTitulo.trim(),
      due_date: novoPrazo || null,
    });

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvando(false);
      return;
    }

    setNovoTitulo("");
    setNovoPrazo("");
    setMostrarForm(false);
    setSalvando(false);
    carregar();
  }

  function iniciarEdicao(task: Task) {
    setEditandoId(task.id);
    setEditTitulo(task.title);
    setEditPrazo(task.due_date ?? "");
  }

  async function salvarEdicao(taskId: string) {
    if (!editTitulo.trim()) return;
    const { error } = await supabase
      .from("tasks")
      .update({ title: editTitulo.trim(), due_date: editPrazo || null })
      .eq("id", taskId);

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }
    setEditandoId(null);
    carregar();
  }

  async function excluirTarefa(taskId: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }
    carregar();
  }

  async function alternarConcluida(task: Task) {
    const novoDone = !task.done;
    const { error } = await supabase
      .from("tasks")
      .update({
        done: novoDone,
        completed_at: novoDone ? new Date().toISOString() : null,
      })
      .eq("id", task.id);

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }
    carregar();
  }

  const hoje = hojeISO();
  const limiteSemana = fimDaSemanaISO();

  const { vencidas, proximas, concluidasHoje } = useMemo(() => {
    const vencidas = tasks.filter(
      (t) => !t.done && t.due_date !== null && t.due_date < hoje
    );

    const proximas = tasks.filter((t) => {
      if (t.done) return false;
      if (t.due_date === null) return visao === "hoje" ? false : true;
      if (visao === "hoje") return t.due_date === hoje;
      return t.due_date >= hoje && t.due_date <= limiteSemana;
    });

    const concluidasHoje = tasks.filter(
      (t) => t.done && t.completed_at?.slice(0, 10) === hoje
    );

    return { vencidas, proximas, concluidasHoje };
  }, [tasks, hoje, limiteSemana, visao]);

  function LinhaTarefa({ task }: { task: Task }) {
    if (editandoId === task.id) {
      return (
        <li className="flex flex-wrap items-center gap-2 rounded-xl border border-accent bg-base-surface px-4 py-3.5">
          <input
            value={editTitulo}
            onChange={(e) => setEditTitulo(e.target.value)}
            autoFocus
            className="min-w-[140px] flex-1 rounded-lg border border-base-border bg-base px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            type="date"
            value={editPrazo}
            onChange={(e) => setEditPrazo(e.target.value)}
            className="rounded-lg border border-base-border bg-base px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            onClick={() => salvarEdicao(task.id)}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-base"
          >
            Salvar
          </button>
          <button
            onClick={() => setEditandoId(null)}
            className="text-xs text-ink-faint hover:text-ink"
          >
            Cancelar
          </button>
        </li>
      );
    }

    const atrasada = !task.done && task.due_date !== null && task.due_date < hoje;

    return (
      <li>
        <SwipeRow onEdit={() => iniciarEdicao(task)} onDelete={() => excluirTarefa(task.id)}>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="min-w-0">
              <p
                className={`text-sm font-medium ${
                  task.done ? "text-ink-muted line-through" : "text-ink"
                }`}
              >
                {task.title}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                {task.due_date && (
                  <span className={`text-xs ${atrasada ? "text-warn" : "text-ink-faint"}`}>
                    {formatarData(task.due_date)}
                  </span>
                )}
                {atrasada && (
                  <span className="rounded-full bg-warn-dim px-2 py-0.5 text-[10px] font-semibold text-warn">
                    VENCIDA
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => alternarConcluida(task)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                task.done
                  ? "border-accent bg-accent text-base"
                  : "border-base-border text-ink-faint hover:border-accent hover:text-accent"
              }`}
              aria-label={task.done ? "Reabrir tarefa" : "Concluir tarefa"}
            >
              {task.done ? "✓" : ""}
            </button>
          </div>
        </SwipeRow>
      </li>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Tarefas</h1>
          <p className="mt-1 text-sm text-ink-muted">Com prazo. Não contam no streak.</p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          {mostrarForm ? "Cancelar" : "+ Nova tarefa"}
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={criarTarefa}
          className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-base-border bg-base-surface p-4"
        >
          <input
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            placeholder="Nova tarefa, ex: Organizar mesa"
            className="min-w-[200px] flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />
          <input
            type="date"
            value={novoPrazo}
            onChange={(e) => setNovoPrazo(e.target.value)}
            className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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

      <div className="mb-6 flex w-fit rounded-lg border border-base-border p-1">
        <button
          onClick={() => setVisao("hoje")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            visao === "hoje" ? "bg-ink text-base" : "text-ink-muted hover:text-ink"
          }`}
        >
          Hoje
        </button>
        <button
          onClick={() => setVisao("semana")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            visao === "semana" ? "bg-ink text-base" : "text-ink-muted hover:text-ink"
          }`}
        >
          Semana
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {visao === "hoje" ? "Hoje" : "Esta semana"}
            </h2>
            {proximas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-base-border p-6 text-center">
                <p className="text-sm text-ink-muted">Nada por aqui. Aproveite ou adiante algo.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {proximas.map((t) => (
                  <LinhaTarefa key={t.id} task={t} />
                ))}
              </ul>
            )}
          </section>

          {vencidas.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warn">
                <span>⚠</span> Vencidas
              </h2>
              <ul className="flex flex-col gap-2">
                {vencidas.map((t) => (
                  <LinhaTarefa key={t.id} task={t} />
                ))}
              </ul>
            </section>
          )}

          {concluidasHoje.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Concluídas (hoje)
              </h2>
              <ul className="flex flex-col gap-2">
                {concluidasHoje.map((t) => (
                  <LinhaTarefa key={t.id} task={t} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
