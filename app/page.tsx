"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import type { Habit, HabitLog } from "@/types/database";

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function ultimosNDias(n: number): string[] {
  const dias: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function DashboardPage() {
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logsSemana, setLogsSemana] = useState<HabitLog[]>([]);
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

    const dias = ultimosNDias(7);

    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: true });

    const { data: logsData } = await supabase
      .from("habit_logs")
      .select("*")
      .gte("date", dias[0])
      .lte("date", dias[dias.length - 1]);

    setHabits((habitsData as Habit[]) ?? []);
    setLogsSemana((logsData as HabitLog[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const dias = ultimosNDias(7);
  const hoje = hojeISO();

  const logsPorDia = dias.map((dia) => {
    const logsDoDia = logsSemana.filter((l) => l.date === dia && l.done);
    const total = habits.length;
    const feitos = logsDoDia.length;
    return { dia, feitos, total, pct: total > 0 ? feitos / total : 0 };
  });

  const feitosHoje = logsSemana.filter((l) => l.date === hoje && l.done).length;
  const totalHoje = habits.length;

  // Calcula streak (sequência) atual: dias consecutivos com >=1 hábito feito, terminando hoje ou ontem
  function calcularStreak(): number {
    let streak = 0;
    const datasComLog = new Set(
      logsSemana.filter((l) => l.done).map((l) => l.date)
    );
    let cursor = new Date();
    while (true) {
      const iso = cursor.toISOString().slice(0, 10);
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

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">
          {saudacao()}
          {nomeUsuario ? `, ${nomeUsuario}` : ""}.
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Aqui está seu progresso recente.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <CardEstatistica
              label="Hoje"
              valor={totalHoje > 0 ? `${feitosHoje}/${totalHoje}` : "—"}
              destaque={totalHoje > 0 && feitosHoje === totalHoje}
            />
            <CardEstatistica
              label="Sequência atual"
              valor={`${streak} ${streak === 1 ? "dia" : "dias"}`}
              destaque={streak >= 3}
            />
            <CardEstatistica
              label="Hábitos ativos"
              valor={String(habits.length)}
            />
          </div>

          <section className="mb-8 rounded-xl border border-base-border bg-base-surface p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              Últimos 7 dias
            </h2>
            <div className="flex items-end justify-between gap-2">
              {logsPorDia.map(({ dia, pct, feitos, total }) => {
                const data = new Date(dia + "T12:00:00");
                const isHoje = dia === hoje;
                return (
                  <div key={dia} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-20 w-full items-end overflow-hidden rounded-md bg-base">
                      <div
                        className="w-full rounded-md transition-all"
                        style={{
                          height: `${Math.max(pct * 100, total === 0 ? 0 : 6)}%`,
                          backgroundColor: pct === 1 && total > 0 ? "#2DD4BF" : "#5A6172",
                        }}
                        title={`${feitos}/${total}`}
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
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={`mt-1 font-display text-2xl font-bold ${
          destaque ? "text-accent" : "text-ink"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
