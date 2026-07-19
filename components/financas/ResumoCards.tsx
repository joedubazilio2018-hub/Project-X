import { formatarMoeda } from "@/lib/financas-utils";

type ResumoCardsProps = {
  saldoDevedor: number;
  receitasMes: number;
  despesasMes: number;
};

export default function ResumoCards({ saldoDevedor, receitasMes, despesasMes }: ResumoCardsProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <div className="rounded-xl border border-base-border bg-base-surface p-4">
        <p className="text-xs text-ink-muted">Saldo devedor</p>
        <p
          className={`mt-1 font-display text-xl font-bold ${
            saldoDevedor > 0 ? "text-warn" : "text-accent"
          }`}
        >
          {formatarMoeda(saldoDevedor)}
        </p>
        <p className="mt-0.5 text-[10px] text-ink-faint">
          Contas do mês + atrasadas, ainda não pagas
        </p>
      </div>
      <div className="rounded-xl border border-base-border bg-base-surface p-4">
        <p className="text-xs text-ink-muted">Receitas (mês)</p>
        <p className="mt-1 font-display text-xl font-bold text-accent">
          {formatarMoeda(receitasMes)}
        </p>
      </div>
      <div className="rounded-xl border border-base-border bg-base-surface p-4">
        <p className="text-xs text-ink-muted">Despesas (mês)</p>
        <p className="mt-1 font-display text-xl font-bold text-warn">
          {formatarMoeda(despesasMes)}
        </p>
      </div>
    </div>
  );
}
