import Link from "next/link";
import { formatarMoeda } from "@/lib/financas-utils";

export type ResumoRapidoDados = {
  saldo: number;
  receitaMes: number;
  despesaMes: number;
  aguaMl: number;
  aguaMetaMl: number;
  diasEscritos: number;
  diasNoMes: number;
};

export default function QuickSummaryGrid({ dados }: { dados: ResumoRapidoDados }) {
  const { saldo, receitaMes, despesaMes, aguaMl, aguaMetaMl, diasEscritos, diasNoMes } = dados;
  const percentualAgua = aguaMetaMl > 0 ? Math.min(100, Math.round((aguaMl / aguaMetaMl) * 100)) : 0;

  return (
    <section className="mb-5">
      <h2 className="mb-3 text-base font-semibold text-ink">Resumo rápido</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
        {/* Saldo */}
        <Link
          href="/financas"
          className="w-[42%] flex-shrink-0 rounded-2xl border border-base-border bg-base-surface p-4 sm:w-auto"
        >
          <p className="text-xs text-ink-muted">Saldo</p>
          <p className={`mt-1.5 font-display text-xl font-bold ${saldo < 0 ? "text-warn" : "text-accent"}`}>
            {formatarMoeda(saldo)}
          </p>
        </Link>

        {/* Receita / Despesa do mês — recalculado sempre a partir da data atual, então
            troca automaticamente assim que o mês vira (ver lógica em app/painel/page.tsx) */}
        <Link
          href="/financas"
          className="w-[42%] flex-shrink-0 rounded-2xl border border-base-border bg-base-surface p-4 sm:w-auto"
        >
          <p className="text-xs text-ink-muted">Este mês</p>
          <p className="mt-1.5 truncate font-display text-base font-bold text-accent">
            +{formatarMoeda(receitaMes)}
          </p>
          <p className="truncate font-display text-base font-bold text-warn">
            -{formatarMoeda(despesaMes)}
          </p>
        </Link>

        {/* Meta de água */}
        <Link
          href="/habitos"
          className="w-[42%] flex-shrink-0 rounded-2xl border border-base-border bg-base-surface p-4 sm:w-auto"
        >
          <p className="text-xs text-ink-muted">Meta de água</p>
          <p className="mt-1.5 truncate font-display text-lg font-bold text-ink">
            {aguaMl}/{aguaMetaMl}ml
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-base">
            <div className="h-full rounded-full bg-accent" style={{ width: `${percentualAgua}%` }} />
          </div>
        </Link>

        {/* Dias escritos */}
        <Link
          href="/diario"
          className="w-[42%] flex-shrink-0 rounded-2xl border border-base-border bg-base-surface p-4 sm:w-auto"
        >
          <p className="text-xs text-ink-muted">Dias escritos</p>
          <p className="mt-1.5 font-display text-xl font-bold text-ink">
            {diasEscritos}/{diasNoMes} <span className="text-sm font-normal text-ink-faint">dias</span>
          </p>
        </Link>
      </div>
    </section>
  );
}
