import type { Goal } from "@/types/database";
import { formatarMoeda } from "@/lib/financas-utils";

type MetaVinculavel = Pick<Goal, "id" | "title" | "target_amount" | "current_amount">;

type SecaoPoupancaProps = {
  metasVinculaveis: MetaVinculavel[];
  valorPoupanca: Record<string, string>;
  setValorPoupanca: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  enviandoPoupancaId: string | null;
  guardarNaPoupanca: (goal: MetaVinculavel) => void;
};

export default function SecaoPoupanca({
  metasVinculaveis,
  valorPoupanca,
  setValorPoupanca,
  enviandoPoupancaId,
  guardarNaPoupanca,
}: SecaoPoupancaProps) {
  return (
    <section className="mb-6">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-ink">Poupança</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Guarde dinheiro pras suas metas. Cada valor guardado vira uma despesa
          normal aqui embaixo e soma no progresso da meta lá em Metas.
        </p>
      </div>

      {metasVinculaveis.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nenhuma meta com valor alvo ainda. Crie uma meta com "valor alvo" em
          Metas pra poder guardar dinheiro pra ela aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {metasVinculaveis.map((goal) => {
            const alvo = goal.target_amount ?? 0;
            const pct = alvo > 0 ? Math.min(100, (goal.current_amount / alvo) * 100) : 0;
            return (
              <li key={goal.id} className="rounded-xl border border-base-border bg-base-surface p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{goal.title}</span>
                  <span className="text-xs text-ink-muted">
                    {formatarMoeda(goal.current_amount)} / {formatarMoeda(alvo)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-base">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={valorPoupanca[goal.id] || ""}
                    onChange={(e) =>
                      setValorPoupanca((prev) => ({ ...prev, [goal.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        guardarNaPoupanca(goal);
                      }
                    }}
                    placeholder="Valor a guardar (ex: 50)"
                    inputMode="decimal"
                    className="flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => guardarNaPoupanca(goal)}
                    disabled={enviandoPoupancaId === goal.id}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {enviandoPoupancaId === goal.id ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
