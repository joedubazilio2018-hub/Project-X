import type { Category, Transaction, TransactionType } from "@/types/database";
import SwipeRow from "@/components/SwipeRow";
import { estaAtrasada, formatarDataCurta, formatarMoeda } from "@/lib/financas-utils";

type SecaoLancamentosProps = {
  categories: Category[];
  historicoLancamentos: Transaction[];
  lancamentosVisiveis: Transaction[];
  contasAtrasadas: Transaction[];
  temMais: boolean;
  totalExibidos: number;
  mostrarFormLancamento: boolean;
  setMostrarFormLancamento: React.Dispatch<React.SetStateAction<boolean>>;
  setPaginaAtual: React.Dispatch<React.SetStateAction<number>>;

  // Form state
  tipo: TransactionType;
  setTipo: (t: TransactionType) => void;
  valor: string;
  setValor: (v: string) => void;
  categoriaId: string;
  setCategoriaId: (v: string) => void;
  descricao: string;
  setDescricao: (v: string) => void;
  data: string;
  setData: (v: string) => void;
  repetir: boolean;
  setRepetir: (v: boolean) => void;
  totalParcelas: string;
  setTotalParcelas: (v: string) => void;
  editandoId: string | null;
  editandoTransacao: Transaction | null;
  aplicarEmTodasParcelas: boolean;
  setAplicarEmTodasParcelas: (v: boolean) => void;
  salvando: boolean;

  salvarLancamento: (e: React.FormEvent) => void;
  cancelarEdicao: () => void;
  resetFormLancamento: () => void;
  iniciarEdicao: (t: Transaction) => void;
  excluirLancamento: (t: Transaction) => void;
  alternarPago: (t: Transaction) => void;
};

export default function SecaoLancamentos({
  categories,
  historicoLancamentos,
  lancamentosVisiveis,
  contasAtrasadas,
  temMais,
  totalExibidos,
  mostrarFormLancamento,
  setMostrarFormLancamento,
  setPaginaAtual,
  tipo,
  setTipo,
  valor,
  setValor,
  categoriaId,
  setCategoriaId,
  descricao,
  setDescricao,
  data,
  setData,
  repetir,
  setRepetir,
  totalParcelas,
  setTotalParcelas,
  editandoId,
  editandoTransacao,
  aplicarEmTodasParcelas,
  setAplicarEmTodasParcelas,
  salvando,
  salvarLancamento,
  cancelarEdicao,
  resetFormLancamento,
  iniciarEdicao,
  excluirLancamento,
  alternarPago,
}: SecaoLancamentosProps) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">
          Lançamentos
          {historicoLancamentos.length > 0 && (
            <span className="ml-2 text-xs font-normal text-ink-faint">
              ({historicoLancamentos.length} no total)
            </span>
          )}
        </h2>
        <button
          onClick={() => {
            if (mostrarFormLancamento) {
              resetFormLancamento();
            } else {
              setMostrarFormLancamento(true);
            }
          }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          {mostrarFormLancamento ? "Cancelar" : "+ Novo lançamento"}
        </button>
      </div>

      {mostrarFormLancamento && (
        <form onSubmit={salvarLancamento} className="mb-4 flex flex-col gap-3 rounded-xl border border-base-border bg-base-surface p-5">
          {editandoId && <p className="text-xs font-medium text-accent">Editando lançamento existente</p>}

          {editandoTransacao?.recurrence_group_id && (
            <div className="rounded-lg border border-accent/40 bg-accent-dim p-3 text-xs">
              <p className="mb-2 font-medium text-ink">
                Essa parcela faz parte de uma recorrência ({editandoTransacao.installment_number}/{editandoTransacao.installment_total}). Deseja alterar apenas esta parcela ou todas?
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-ink-muted">
                  <input type="radio" name="escopoEdicao" checked={!aplicarEmTodasParcelas} onChange={() => setAplicarEmTodasParcelas(false)} className="accent-accent" />
                  Somente esta parcela
                </label>
                <label className="flex items-center gap-2 text-ink-muted">
                  <input type="radio" name="escopoEdicao" checked={aplicarEmTodasParcelas} onChange={() => setAplicarEmTodasParcelas(true)} className="accent-accent" />
                  Todas as parcelas do grupo (datas individuais não mudam)
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setTipo("expense")} className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${tipo === "expense" ? "border-warn bg-warn-dim text-warn" : "border-base-border text-ink-muted"}`}>Despesa</button>
            <button type="button" onClick={() => setTipo("income")} className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${tipo === "income" ? "border-accent bg-accent-dim text-accent" : "border-base-border text-ink-muted"}`}>Receita</button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor (ex: 49,90)" inputMode="decimal" className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:flex-1" required />
            <div className="flex flex-col gap-1">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} disabled={aplicarEmTodasParcelas} className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50" />
              {aplicarEmTodasParcelas && <span className="text-xs text-ink-faint">Datas individuais não mudam</span>}
            </div>
          </div>

          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent">
            <option value="">Sem categoria</option>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>

          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" className="rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent" />

          {(!editandoId || !editandoTransacao?.recurrence_group_id) && (
            <div className="flex flex-col gap-2 rounded-lg border border-base-border bg-base p-3">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={repetir} onChange={(e) => setRepetir(e.target.checked)} className="h-4 w-4 rounded border-base-border accent-accent" />
                {editandoId ? "Transformar em recorrência" : "Repetir em vários meses (parcelado ou recorrente)"}
              </label>

              {repetir && (
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-xs text-ink-muted">Repetir por</span>
                  <input type="number" min={2} max={60} value={totalParcelas} onChange={(e) => setTotalParcelas(e.target.value)} className="w-16 rounded-lg border border-base-border bg-base-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                  <span className="text-xs text-ink-muted">meses (1/{totalParcelas || "?"}, 2/{totalParcelas || "?"}...)</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={salvando} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50">
              {editandoId ? "Salvar alterações" : "Salvar lançamento"}
            </button>
            {editandoId && (
              <button type="button" onClick={cancelarEdicao} className="text-sm font-medium text-ink-muted hover:text-ink">Cancelar edição</button>
            )}
          </div>
        </form>
      )}

      {contasAtrasadas.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-warn/40 bg-warn-dim px-4 py-2.5 text-xs font-medium text-warn">
          ⚠ Você tem {contasAtrasadas.length} {contasAtrasadas.length > 1 ? "contas atrasadas" : "conta atrasada"}.
        </div>
      )}

      {historicoLancamentos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
          <p className="text-sm text-ink-muted">Você ainda não tem lançamentos.</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {lancamentosVisiveis.map((t) => {
              const cat = categories.find((c) => c.id === t.category_id);
              return (
                <li key={t.id}>
                  <SwipeRow onEdit={() => iniciarEdicao(t)} onDelete={() => excluirLancamento(t)}>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => alternarPago(t)}
                          title={t.paid ? "Marcar como pendente" : t.type === "income" ? "Marcar como recebido" : "Marcar como pago"}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${t.paid ? "border-accent bg-accent text-base" : estaAtrasada(t) ? "border-warn text-transparent hover:border-warn" : "border-base-border text-transparent hover:border-accent"}`}
                        >
                          ✓
                        </button>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat?.color ?? "#57575B" }} />
                        <div>
                          <p className="text-sm text-ink">
                            {t.description || cat?.name || "Lançamento"}
                            {t.installment_total ? (
                              <span className="ml-1.5 text-xs text-ink-faint">({t.installment_number}/{t.installment_total})</span>
                            ) : null}
                            {t.paid ? (
                              <span className="ml-1.5 rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] font-medium text-accent">{t.type === "income" ? "Recebido" : "Pago"}</span>
                            ) : estaAtrasada(t) ? (
                              <span className="ml-1.5 rounded-full bg-warn-dim px-1.5 py-0.5 text-[10px] font-medium text-warn">Atrasada</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-ink-faint">
                            {formatarDataCurta(t.date)}{cat ? ` · ${cat.name}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${t.type === "income" ? "text-accent" : "text-warn"}`}>
                        {t.type === "income" ? "+" : "−"}{formatarMoeda(t.amount)}
                      </span>
                    </div>
                  </SwipeRow>
                </li>
              );
            })}
          </ul>

          {temMais && (
            <button
              onClick={() => setPaginaAtual((p) => p + 1)}
              className="mt-3 w-full rounded-lg border border-base-border py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
            >
              Ver mais ({historicoLancamentos.length - totalExibidos} restantes)
            </button>
          )}
        </>
      )}
    </section>
  );
}
