import type { Transaction } from "@/types/database";

export function hojeISO(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function adicionarMeses(dataISO: string, meses: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const totalMeses = mes - 1 + meses;
  const novoAno = ano + Math.floor(totalMeses / 12);
  const novoMesIndex = ((totalMeses % 12) + 12) % 12;
  const ultimoDiaDoMes = new Date(novoAno, novoMesIndex + 1, 0).getDate();
  const novoDia = Math.min(dia, ultimoDiaDoMes);
  const mesStr = String(novoMesIndex + 1).padStart(2, "0");
  const diaStr = String(novoDia).padStart(2, "0");
  return `${novoAno}-${mesStr}-${diaStr}`;
}

export function formatarDataCurta(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function estaAtrasada(t: Transaction): boolean {
  return t.type === "expense" && !t.paid && t.date < hojeISO();
}
