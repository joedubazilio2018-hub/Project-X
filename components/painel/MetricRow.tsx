import Link from "next/link";

type MetricRowProps = {
  icone: React.ReactNode;
  label: string;
  fracaoTexto: string; // ex.: "1/3" ou "1200/3000ml"
  percentual: number; // 0 a 100
  href?: string; // se informado, a linha inteira vira um link pra tela correspondente
};

export default function MetricRow({ icone, label, fracaoTexto, percentual, href }: MetricRowProps) {
  const pct = Math.min(100, Math.max(0, percentual));

  const conteudo = (
    <>
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-base text-ink-muted">
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-ink">{label}</span>
          <span className="flex-shrink-0 text-xs tabular-nums text-ink-faint">{fracaoTexto}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-base">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="-mx-1 flex items-center gap-3 rounded-lg px-1 py-0.5 transition-colors active:bg-base"
      >
        {conteudo}
      </Link>
    );
  }

  return <div className="flex items-center gap-3">{conteudo}</div>;
}
