"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import type { Habit, HabitLog } from "@/types/database";

const CORES = ["#2DD4BF", "#F2B84B", "#FB7185", "#60A5FA", "#A78BFA"];

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HabitosPage() {
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logsHoje, setLogsHoje] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState(CORES[0]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: true });

    const { data: logsData } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("date", hojeISO());

    const mapaLogs: Record<string, boolean> = {};
    (logsData as HabitLog[] | null)?.forEach((log) => {
      mapaLogs[log.habit_id] = log.done;
    });

    setHabits((habitsData as Habit[]) ?? []);
    setLogsHoje(mapaLogs);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function criarHabito(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    await supabase.from("habits").insert({
      user_id: userId,
      name: novoNome.trim(),
      color: novaCor,
      frequency: "daily",
    });

    setNovoNome("");
    setNovaCor(CORES[0]);
    setSalvando(false);
    carregar();
  }

  async function alternarCheckin(habitId: string) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const feitoAgora = !logsHoje[habitId];

    // Atualização otimista na tela
    setLogsHoje((prev) => ({ ...prev, [habitId]: feitoAgora }));

    await supabase
      .from("habit_logs")
      .upsert(
        {
          habit_id: habitId,
          user_id: userId,
          date: hojeISO(),
          done: feitoAgora,
        },
        { onConflict: "habit_id,date" }
      );
  }

  async function arquivarHabito(habitId: string) {
    await supabase.from("habits").update({ archived: true }).eq("id", habitId);
    carregar();
  }

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Hábitos</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Marque o que você cumpriu hoje.
        </p>
      </header>

      <form
        onSubmit={criarHabito}
        className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-base-border bg-base-surface p-4"
      >
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Novo hábito, ex: Ler 20 minutos"
          className="min-w-[200px] flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <div className="flex gap-1.5">
          {CORES.map((cor) => (
            <button
              key={cor}
              type="button"
              onClick={() => setNovaCor(cor)}
              className="h-7 w-7 rounded-full transition-transform"
              style={{
                backgroundColor: cor,
                transform: novaCor === cor ? "scale(1.15)" : "scale(1)",
                outline: novaCor === cor ? `2px solid ${cor}` : "none",
                outlineOffset: "2px",
              }}
              aria-label={`Escolher cor ${cor}`}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : habits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
          <p className="text-sm text-ink-muted">
            Você ainda não tem hábitos. Adicione o primeiro acima.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.map((habit) => {
            const feito = !!logsHoje[habit.id];
            return (
              <li
                key={habit.id}
                className="group flex items-center justify-between rounded-xl border border-base-border bg-base-surface px-4 py-3.5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                  <span
                    className={`text-sm font-medium ${
                      feito ? "text-ink-muted line-through" : "text-ink"
                    }`}
                  >
                    {habit.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => arquivarHabito(habit.id)}
                    className="hidden text-xs text-ink-faint transition-colors hover:text-warn group-hover:block"
                  >
                    Arquivar
                  </button>
                  <button
                    onClick={() => alternarCheckin(habit.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                      feito
                        ? "border-accent bg-accent text-base"
                        : "border-base-border text-ink-faint hover:border-accent hover:text-accent"
                    }`}
                    aria-label={feito ? "Desmarcar" : "Marcar como feito"}
                  >
                    {feito ? "✓" : ""}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
