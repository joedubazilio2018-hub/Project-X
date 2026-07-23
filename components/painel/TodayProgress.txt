import Link from "next/link";
import ProgressRing from "./ProgressRing";
import MetricRow from "./MetricRow";

export type MetricasHoje = {
  habitosFeitos: number;
  habitosTotal: number;
  tarefasFeitas: number;
  tarefasTotal: number;
  treinosFeitos: number;
  treinosMeta: number;
  aguaMl: number;
  aguaMetaMl: number;
};

function percentualSeguro(feito: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((feito / total) * 100);
}

export default function TodayProgress({ metricas }: { metricas: MetricasHoje }) {
  const { habitosFeitos, habitosTotal, tarefasFeitas, tarefasTotal, treinosFeitos, treinosMeta, aguaMl, aguaMetaMl } =
    metricas;

  const percentuais = [
    percentualSeguro(habitosFeitos, habitosTotal),
    percentualSeguro(tarefasFeitas, tarefasTotal),
    percentualSeguro(treinosFeitos, treinosMeta),
    percentualSeguro(aguaMl, aguaMetaMl),
  ].filter((_, i) => {
    // só considera métricas que têm meta definida (total > 0) no cálculo do score geral
    const totais = [habitosTotal, tarefasTotal, treinosMeta, aguaMetaMl];
    return totais[i] > 0;
  });

  const scoreGeral =
    percentuais.length > 0
      ? Math.round(percentuais.reduce((a, b) => a + b, 0) / percentuais.length)
      : 0;

  return (
    <section className="mb-5 rounded-2xl border border-base-border bg-base-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Seu progresso hoje</h2>
        <Link href="/habitos" className="text-xs font-medium text-accent hover:underline">
          Ver tudo →
        </Link>
      </div>

      <div className="flex items-center gap-5">
        <ProgressRing percentual={scoreGeral} valorCentral={`${scoreGeral}%`} legenda="hoje" />

        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <MetricRow
            icone={<IconeHabito className="h-3.5 w-3.5" />}
            label="Hábitos"
            fracaoTexto={`${habitosFeitos}/${habitosTotal}`}
            percentual={percentualSeguro(habitosFeitos, habitosTotal)}
          />
          <MetricRow
            icone={<IconeTarefa className="h-3.5 w-3.5" />}
            label="Tarefas"
            fracaoTexto={`${tarefasFeitas}/${tarefasTotal}`}
            percentual={percentualSeguro(tarefasFeitas, tarefasTotal)}
          />
          <MetricRow
            icone={<IconeTreino className="h-3.5 w-3.5" />}
            label="Treinos"
            fracaoTexto={`${treinosFeitos}/${treinosMeta}`}
            percentual={percentualSeguro(treinosFeitos, treinosMeta)}
          />
          <MetricRow
            icone={<IconeAgua className="h-3.5 w-3.5" />}
            label="Água"
            fracaoTexto={`${aguaMl}/${aguaMetaMl}ml`}
            percentual={percentualSeguro(aguaMl, aguaMetaMl)}
          />
        </div>
      </div>
    </section>
  );
}

function IconeHabito({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3L15.5 9.5" />
    </svg>
  );
}
function IconeTarefa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}
function IconeTreino({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6.5 6.5 4 4M17.5 17.5 20 20M2 22l7-7M22 2l-7 7" />
      <path d="m14.5 6.5-8 8" />
      <rect x="12.5" y="3.5" width="4" height="4" rx="1" transform="rotate(45 14.5 5.5)" />
      <rect x="7.5" y="16.5" width="4" height="4" rx="1" transform="rotate(45 9.5 18.5)" />
    </svg>
  );
}
function IconeAgua({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
    </svg>
  );
}
