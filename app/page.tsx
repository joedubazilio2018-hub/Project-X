import Link from "next/link";
import Image from "next/image";

const INTENSIDADE_GRADE: number[] = [
  0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 2, 1, 1, 1, 0, 0,
  0, 1, 1, 2, 2, 1, 0, 1, 1, 0, 1, 2, 2, 2, 2, 1, 0, 1, 1, 1, 2, 3, 2, 2, 2, 1,
  1, 2, 2, 2, 3, 3, 2, 2, 2, 1, 1, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 4, 3, 3, 3, 2,
  1, 2, 3, 3, 3, 4, 4, 3, 3, 2, 2, 3, 4,
];

const CORES_INTENSIDADE = [
  "#1C1C20", // 0 — nada ainda
  "#3A2216", // 1
  "#7A3417", // 2
  "#B84420", // 3
  "#E8541E", // 4 — constância plena
];

const MODULOS = [
  { nome: "Hábitos", desc: "Sequências diárias, sem perdoar o dia que você pulou." },
  { nome: "Metas", desc: "Prazos e status — do rascunho até concluído." },
  { nome: "Tarefas", desc: "O que precisa sair da cabeça e virar feito." },
  { nome: "Treinos", desc: "Rotinas, séries e histórico de cada sessão." },
  { nome: "Dieta", desc: "Macros do dia contra seu gasto calórico real." },
  { nome: "Diário", desc: "Um registro honesto de como o dia foi." },
  { nome: "Finanças", desc: "Entradas, saídas e previsão — sem letra miúda." },
  { nome: "Notas", desc: "O resto que não cabia em nenhum módulo." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-base text-ink">
      {/* Header */}
      <header className="relative mx-auto flex max-w-5xl items-center justify-center px-6 py-6">
        <Image
          src="/logo-mark.png"
          alt="ASCEN"
          width={96}
          height={96}
          priority
          className="h-14 w-14 object-contain"
        />
        <Link
          href="/login"
          className="absolute right-6 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          Entrar
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-10 text-center sm:pt-16">
        <h1 className="font-display text-4xl font-bold leading-[1.1] sm:text-5xl">
          Hábitos, metas e rotina.
          <br />
          <span className="text-ink-muted">Sem desculpas.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base text-ink-muted">
          Um único lugar pra hábitos, metas, tarefas, treinos, dieta, diário
          e finanças — com um placar diário que junta tudo isso numa
          resposta simples: hoje você avançou ou não?
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login?mode=signup"
            className="w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-base transition-opacity hover:opacity-90 sm:w-auto"
          >
            Começar grátis por 7 dias
          </Link>
          <Link
            href="/login"
            className="w-full rounded-lg border border-base-border px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink-faint sm:w-auto"
          >
            Já tenho conta
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Leva menos de um minuto pra começar.
        </p>

        {/* Signature: a grade de constância que existe de verdade no app,
            aqui contando a história de antes/depois em silêncio. */}
        <div className="mx-auto mt-14 grid max-w-lg grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
          {INTENSIDADE_GRADE.map((intensidade, i) => (
            <div
              key={i}
              className="aspect-square w-full rounded-[2px]"
              style={{ backgroundColor: CORES_INTENSIDADE[intensidade] }}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          90 dias. Isso é o que a constância parece, de verdade.
        </p>
      </section>

      {/* Módulos */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MODULOS.map((m) => (
            <div
              key={m.nome}
              className="rounded-xl border border-base-border bg-base-surface p-4"
            >
              <h3 className="text-sm font-semibold text-ink">{m.nome}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <div className="rounded-xl border border-base-border bg-base-surface p-8">
          <h2 className="font-display text-2xl font-bold text-ink">
            O placar de hoje ainda está em branco.
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            7 dias grátis pra sentir a diferença.
          </p>
          <Link
            href="/login?mode=signup"
            className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-base transition-opacity hover:opacity-90"
          >
            Criar minha conta
          </Link>
        </div>
      </section>

      <footer className="border-t border-base-border px-6 py-10 text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-ink-faint">
          desenvolvido por
        </p>
        <Image
          src="/jb-group-logo.png"
          alt="JB Group"
          width={210}
          height={140}
          className="mx-auto h-10 w-auto object-contain"
        />
      </footer>
    </main>
  );
}
