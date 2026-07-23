type ProgressRingProps = {
  /** 0 a 100 */
  percentual: number;
  /** texto central grande (ex.: "72%" ou "7") */
  valorCentral: string;
  /** texto pequeno abaixo do valor central (opcional) */
  legenda?: string;
  tamanho?: number;
  espessura?: number;
};

export default function ProgressRing({
  percentual,
  valorCentral,
  legenda,
  tamanho = 104,
  espessura = 10,
}: ProgressRingProps) {
  const pct = Math.min(100, Math.max(0, percentual));
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - pct / 100);
  const centro = tamanho / 2;

  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle
          cx={centro}
          cy={centro}
          r={raio}
          fill="none"
          stroke="#2A2A2D"
          strokeWidth={espessura}
        />
        <circle
          cx={centro}
          cy={centro}
          r={raio}
          fill="none"
          stroke="#E8541E"
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold text-ink">{valorCentral}</span>
        {legenda && <span className="text-[10px] text-ink-faint">{legenda}</span>}
      </div>
    </div>
  );
}
