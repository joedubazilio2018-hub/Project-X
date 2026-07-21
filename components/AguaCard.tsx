"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { WaterLog } from "@/types/database";
import { useToast } from "@/components/ToastProvider";

const MSG_ERRO_PADRAO = "Não deu pra salvar agora. Tenta de novo em instantes.";
const TAMANHO_COPO_ML = 250;
const METAS_SUGERIDAS = [1500, 2000, 2500, 3000];

function hojeISO(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default function AguaCard() {
  const supabase = createClient();
  const { mostrarToast } = useToast();
  const hoje = hojeISO();

  const [log, setLog] = useState<WaterLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoMeta, setEditandoMeta] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("water_logs")
      .select("*")
      .eq("date", hoje)
      .maybeSingle();

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
    }

    setLog((data as WaterLog) ?? null);
    setLoading(false);
  }, [supabase, hoje, mostrarToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar(novoMl: number, novaMeta?: number) {
    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSalvando(false);
      return;
    }

    const mlFinal = Math.max(0, novoMl);
    const metaFinal = novaMeta ?? log?.goal_ml ?? 2000;

    const { data, error } = await supabase
      .from("water_logs")
      .upsert(
        {
          user_id: userId,
          date: hoje,
          ml: mlFinal,
          goal_ml: metaFinal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();

    setSalvando(false);

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }

    setLog(data as WaterLog);
  }

  function adicionarCopo() {
    salvar((log?.ml ?? 0) + TAMANHO_COPO_ML);
  }

  function removerCopo() {
    salvar(Math.max(0, (log?.ml ?? 0) - TAMANHO_COPO_ML));
  }

  function escolherMeta(novaMeta: number) {
    salvar(log?.ml ?? 0, novaMeta);
    setEditandoMeta(false);
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-base-border bg-base-surface p-4">
        <p className="text-sm text-ink-muted">Carregando água...</p>
      </section>
    );
  }

  const mlAtual = log?.ml ?? 0;
  const meta = log?.goal_ml ?? 2000;
  const percentual = Math.min(100, Math.round((mlAtual / meta) * 100));
  const coposAtuais = Math.round(mlAtual / TAMANHO_COPO_ML);
  const coposMeta = Math.round(meta / TAMANHO_COPO_ML);

  return (
    <section className="rounded-xl border border-base-border bg-base-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">💧 Água</h2>
        <button
          onClick={() => setEditandoMeta((v) => !v)}
          className="text-xs font-medium text-accent hover:underline"
        >
          Meta: {meta}ml
        </button>
      </div>

      {editandoMeta && (
        <div className="mb-3 flex flex-wrap gap-2">
          {METAS_SUGERIDAS.map((valor) => (
            <button
              key={valor}
              onClick={() => escolherMeta(valor)}
              className={`rounded-full border px-3 py-1 text-xs ${
                valor === meta
                  ? "border-accent bg-accent-dim text-accent"
                  : "border-base-border text-ink-muted hover:border-accent"
              }`}
            >
              {valor}ml
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-base">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${percentual}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-xl font-bold text-ink">
            {mlAtual}ml <span className="text-sm font-normal text-ink-faint">/ {meta}ml</span>
          </p>
          <p className="text-xs text-ink-faint">
            {coposAtuais} de {coposMeta} copos ({TAMANHO_COPO_ML}ml cada)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={removerCopo}
            disabled={salvando || mlAtual === 0}
            aria-label="Remover copo"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-base-border text-ink-muted transition-colors hover:border-warn hover:text-warn disabled:opacity-40"
          >
            −
          </button>
          <button
            onClick={adicionarCopo}
            disabled={salvando}
            aria-label="Adicionar copo"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            +
          </button>
        </div>
      </div>
    </section>
  );
}
