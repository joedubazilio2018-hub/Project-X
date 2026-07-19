import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatarMoeda } from "@/lib/financas-utils";

type DadoPizza = { name: string; value: number; color: string };
type DadoLinha = { dia: string; saldo: number };

type GraficosFinancasProps = {
  dadosPizza: DadoPizza[];
  dadosLinha: DadoLinha[];
};

export default function GraficosFinancas({ dadosPizza, dadosLinha }: GraficosFinancasProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-base-border bg-base-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Gastos por categoria (mês)</h2>
        {dadosPizza.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">Sem despesas registradas neste mês.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={dadosPizza} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                {dadosPizza.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatarMoeda(value)}
                contentStyle={{ backgroundColor: "#16161B", border: "1px solid #2A2A2D", borderRadius: 8, color: "#F0F0EE" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-base-border bg-base-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Evolução do saldo (30 dias)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dadosLinha}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2D" />
            <XAxis dataKey="dia" tick={{ fill: "#9C9CA0", fontSize: 11 }} interval={4} />
            <YAxis tick={{ fill: "#9C9CA0", fontSize: 11 }} width={50} />
            <Tooltip
              formatter={(value: number) => formatarMoeda(value)}
              contentStyle={{ backgroundColor: "#16161B", border: "1px solid #2A2A2D", borderRadius: 8, color: "#F0F0EE" }}
            />
            <Line type="monotone" dataKey="saldo" stroke="#E8541E" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
