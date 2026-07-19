import type { Category, Goal } from "@/types/database";
import { formatarMoeda } from "@/lib/financas-utils";

type MetaVinculavel = Pick<Goal, "id" | "title" | "target_amount" | "current_amount">;

type SecaoCategoriasProps = {
  categories: Category[];
  metasVinculaveis: MetaVinculavel[];
  mostrarFormCategoria: boolean;
  setMostrarFormCategoria: React.Dispatch<React.SetStateAction<boolean>>;
  novaCategoria: string;
  setNovaCategoria: (v: string) => void;
  novaCategoriaMetaId: string;
  setNovaCategoriaMetaId: (v: string) => void;
  salvando: boolean;
  criarCategoria: (e: React.FormEvent) => void;
  excluirCategoria: (id: string) => void;
  vincularCategoriaAMeta: (categoryId: string, goalId: string) => void;
};

export default function SecaoCategorias({
  categories,
  metasVinculaveis,
  mostrarFormCategoria,
  setMostrarFormCategoria,
  novaCategoria,
  setNovaCategoria,
  novaCategoriaMetaId,
  setNovaCategoriaMetaId,
  salvando,
  criarCategoria,
  excluirCategoria,
  vincularCategoriaAMeta,
}: SecaoCategoriasProps) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Categorias</h2>
        <button onClick={() => setMostrarFormCategoria((v) => !v)} className="text-xs font-medium text-accent hover:underline">
          {mostrarFormCategoria ? "Cancelar" : "+ Nova categoria"}
        </button>
      </div>

      {mostrarFormCategoria && (
        <form onSubmit={criarCategoria} className="mb-3 flex flex-col gap-3 rounded-xl border border-base-border bg-base-surface p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <input value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="Ex: Alimentação" className="w-full flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:min-w-[160px]" required />
          <select
            value={novaCategoriaMetaId}
            onChange={(e) => setNovaCategoriaMetaId(e.target.value)}
            className="w-full rounded-lg border border-base-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:w-56"
          >
            <option value="">Não vincular a nenhuma meta</option>
            {metasVinculaveis.map((m) => (
              <option key={m.id} value={m.id}>
                Alimentar: {m.title}
              </option>
            ))}
          </select>
          <button type="submit" disabled={salvando} className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto">Salvar</button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {categories.map((cat) => {
          const metaLigada = metasVinculaveis.find((m) => m.id === cat.linked_goal_id);
          return (
            <div key={cat.id} className="group flex flex-wrap items-center gap-2 rounded-xl border border-base-border px-3 py-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-xs text-ink">{cat.name}</span>
              <select
                value={cat.linked_goal_id ?? ""}
                onChange={(e) => vincularCategoriaAMeta(cat.id, e.target.value)}
                className="ml-auto rounded-lg border border-base-border bg-base px-2 py-1 text-[11px] text-ink-muted outline-none focus:border-accent"
              >
                <option value="">Sem vínculo com meta</option>
                {metasVinculaveis.map((m) => (
                  <option key={m.id} value={m.id}>
                    Alimentar: {m.title}
                  </option>
                ))}
              </select>
              <button onClick={() => excluirCategoria(cat.id)} className="hidden text-ink-faint hover:text-warn group-hover:inline">×</button>
              {metaLigada && (
                <p className="basis-full text-[11px] text-ink-faint">
                  Lançamentos aqui somam ao progresso de "{metaLigada.title}" ({formatarMoeda(metaLigada.current_amount)} / {formatarMoeda(metaLigada.target_amount ?? 0)})
                </p>
              )}
            </div>
          );
        })}
        {categories.length === 0 && <p className="text-sm text-ink-muted">Nenhuma categoria ainda.</p>}
      </div>
    </section>
  );
}
