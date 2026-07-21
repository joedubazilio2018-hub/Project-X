"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { createClient } from "@/lib/supabase-browser";
import type { WeightLog } from "@/types/database";
import { useToast } from "@/components/ToastProvider";

const MSG_ERRO_PADRAO = "Não deu pra salvar agora. Tenta de novo em instantes.";

function hojeISO(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDataCurta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export default function PesoCard() {
  const supabase = createClient();
  const { mostrarToast } = useToast();
  const hoje = hojeISO();

  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pesoInput, setPesoInput] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    const dataLimite = trintaDiasAtras.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("weight_logs")
      .select("*")
      .gte("date", dataLimite)
      .order("date", { ascending: true });

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
    }

    setLogs((data as WeightLog[]) ?? []);
    setLoading(false);
  }, [supabase, mostrarToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirForm() {
    const registroHoje = logs.find((l) => l.date === hoje);
    const ultimo = logs[logs.length - 1];
    setPesoInput(registroHoje ? String(registroHoje.weight_kg) : ultimo ? String(ultimo.weight_kg) : "");
    setMostrarForm(true);
  }

  async function salvarPeso(e: React.FormEvent) {
    e.preventDefault();
    const valor = parseFloat(pesoInput.replace(",", "."));
    if (!valor || valor <= 0) return;

    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSalvando(false);
      return;
    }

    const { error: erroLog } = await supabase.from("weight_logs").upsert(
      { user_id: userId, date: hoje, weight_kg: valor },
      { onConflict: "user_id,date" }
    );

    // Mantém body_metrics.weight_kg em sincronia, pra o cálculo de TDEE
    // usar sempre o peso mais recente. Só atualiza se o perfil já existir.
    const { error: erroMetrics } = await supabase
      .from("body_metrics")
      .update({ weight_kg: valor, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    setSalvando(false);

    if (erroLog || erroMetrics) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }

    setMostrarForm(false);
    carregar();
  }

  const dadosGrafico = useMemo(
    () => logs.map((l) => ({ dia: formatarDataCurta(l.date), peso: l.weight_kg })),
    [logs]
  );

  const pesoAtual = logs.length > 0 ? logs[logs.length - 1].weight_kg : null;
  const pesoInicial = logs.length > 0 ? logs[0].weight_kg : null;
  const variacao = pesoAtual !== null && pesoInicial !== null ? pesoAtual - pesoInicial : null;

  if (loading) {
    return (
      <section className="rounded-xl border border-base-border bg-base-surface p-4">
        <p className="text-sm text-ink-muted">Carregando peso...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-base-border bg-base-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">⚖️ Peso</h2>
        <button
          onClick={abrirForm}
          className="text-xs font-medium text-accent hover:underline"
        >
          Registrar peso
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={salvarPeso}
          className="mb-4 flex items-center gap-2 rounded-lg border border-base-border bg-base p-3"
        >
          <input
            value={pesoInput}
            onChange={(e) => setPesoInput(e.target.value)}
            placeholder="Peso de hoje (kg)"
            inputMode="decimal"
            autoFocus
            className="flex-1 rounded-md border border-base-border bg-base-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={salvando}
            className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-base disabled:opacity-50"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setMostrarForm(false)}
            className="text-xs text-ink-faint hover:text-ink"
          >
            Cancelar
          </button>
        </form>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nenhum peso registrado ainda. Toque em &quot;Registrar peso&quot; pra começar seu histórico.
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-4">
            <div>
              <p className="text-xs text-ink-faint">Peso atual</p>
              <p className="font-display text-xl font-bold text-ink">{pesoAtual}kg</p>
            </div>
            {variacao !== null && (
              <div>
                <p className="text-xs text-ink-faint">Variação (30 dias)</p>
                <p
                  className={`font-display text-xl font-bold ${
                    variacao > 0 ? "text-warn" : variacao < 0 ? "text-accent" : "text-ink"
                  }`}
                >
                  {variacao > 0 ? "+" : ""}
                  {variacao.toFixed(1)}kg
                </p>
              </div>
            )}
          </div>

          {logs.length > 1 && (
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2D" />
                  <XAxis dataKey="dia" tick={{ fill: "#9C9CA0", fontSize: 11 }} interval={Math.max(0, Math.floor(dadosGrafico.length / 6))} />
                  <YAxis
                    tick={{ fill: "#9C9CA0", fontSize: 11 }}
                    width={40}
                    domain={["dataMin - 1", "dataMax + 1"]}
                  />
                  <Tooltip
                    formatter={(value: number) => `${value}kg`}
                    contentStyle={{
                      backgroundColor: "#16161B",
                      border: "1px solid #2A2A2D",
                      borderRadius: 8,
                      color: "#F0F0EE",
                    }}
                  />
                  <Line type="monotone" dataKey="peso" stroke="#E8541E" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </section>
  );
}
