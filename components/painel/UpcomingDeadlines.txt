import Link from "next/link";
import type { Task } from "@/types/database";

function formatarDataAbreviada(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const dia = d.getDate();
  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${dia} de ${mes}.`;
}

export default function UpcomingDeadlines({ tarefas }: { tarefas: Task[] }) {
  const proximas = tarefas
    .filter((t) => !t.done && t.due_date)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 3);

  const temMais =
    tarefas.filter((t) => !t.done && t.due_date).length > proximas.length;

  return (
    <section className="mb-5 rounded-2xl border border-base-border bg-base-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Próximos prazos</h2>
        {temMais && (
          <Link href="/tarefas" className="text-xs font-medium text-accent hover:underline">
            ver todos →
          </Link>
        )}
      </div>

      {proximas.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum prazo por aqui. Você está em dia. 🎉</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {proximas.map((t) => (
            <li key={t.id}>
              <Link
                href="/tarefas"
                className="flex items-center gap-3 rounded-xl px-1 py-2.5 hover:bg-base"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{t.title}</p>
                  <p className="text-xs text-ink-faint">{formatarDataAbreviada(t.due_date!)}</p>
                </div>
                <span className="flex-shrink-0 text-ink-faint">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
