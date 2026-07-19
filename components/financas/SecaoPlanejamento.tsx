import type { Category, Transaction } from "@/types/database";
import { estaAtrasada, formatarDataCurta, formatarMoeda } from "@/lib/financas-utils";

export type MesPlanejamento = {
  chave: string;
  label: string;
  receitas: number;
  despesas: number;
  itens: Transaction[];
};

type SecaoPlanejamentoProps = {
  planejamento: MesPlanejamento[];
  categories: Category[];
  mesPlanejamentoAberto: string | null;
  setMesPlanejamentoAberto: React.Dispatch<React.SetStateAction<string | null>>;
};

export default function SecaoPlanejamento({
  planejamento,
  categories,
  mesPlanejamentoAberto,
  setMesPlanejamentoAberto,
}: SecaoPlanejamentoProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-ink">Planejamento dos próximos meses</h2>
      <div className="flex flex-col gap-2">
        {planejamento.map((m) => {
          const aberto = mesPlanejamentoAberto === m.chave;
          const saldoMes = m.receitas - m.despesas;
          return (
            <div key={m.chave} className="overflow-hidden rounded-xl border border-base-border bg-base-surface">
              <button type="button" onClick={() => setMesPlanejamentoAberto(aberto ? null : m.chave)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                <span className="text-sm font-medium capitalize text-ink">{m.label}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-accent">+{formatarMoeda(m.receitas)}</span>
                  <span className="text-warn">−{formatarMoeda(m.despesas)}</span>
                  <span className={`font-semibold ${saldoMes >= 0 ? "text-accent" : "text-warn"}`}>{formatarMoeda(saldoMes)}</span>
                </div>
              </button>
              {aberto && (
                <ul className="flex flex-col gap-1 border-t border-base-border px-4 py-2">
                  {m.itens.length === 0 ? (
                    <li className="py-2 text-xs text-ink-faint">Nenhum lançamento previsto para este mês.</li>
                  ) : (
                    m.itens.map((t) => {
                      const cat = categories.find((c) => c.id === t.category_id);
                      return (
                        <li key={t.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-ink-muted">
                              {formatarDataCurta(t.date)} · {t.description || cat?.name || "Lançamento"}
                              {t.installment_total ? ` (${t.installment_number}/${t.installment_total})` : ""}
                            </span>
                            {t.paid ? (
                              <span className="rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] font-medium text-accent">{t.type === "income" ? "Recebido" : "Pago"}</span>
                            ) : estaAtrasada(t) ? (
                              <span className="rounded-full bg-warn-dim px-1.5 py-0.5 text-[10px] font-medium text-warn">Atrasada</span>
                            ) : null}
                          </div>
                          <span className={t.type === "income" ? "text-accent" : "text-warn"}>
                            {t.type === "income" ? "+" : "−"}{formatarMoeda(t.amount)}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
