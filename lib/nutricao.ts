// Helpers de cálculo nutricional compartilhados entre a Dieta (dentro de
// Treinos) e o resumo de Dieta no Dashboard, pra manter os dois em sincronia
// sem duplicar a fórmula em dois lugares.

import type { BodyMetrics, ActivityLevel } from "@/types/database";

export const MULTIPLICADORES: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

export const LABEL_ATIVIDADE: Record<ActivityLevel, string> = {
  sedentario: "Sedentário (pouco ou nenhum exercício)",
  leve: "Leve (1-3x por semana)",
  moderado: "Moderado (3-5x por semana)",
  intenso: "Intenso (6-7x por semana)",
  muito_intenso: "Muito intenso (2x ao dia / físico)",
};

/** Taxa Metabólica Basal, fórmula de Mifflin-St Jeor. */
export function calcularTMB(m: BodyMetrics): number {
  const base = 10 * m.weight_kg + 6.25 * m.height_cm - 5 * m.age;
  return m.sex === "m" ? base + 5 : base - 161;
}

/** Gasto Energético Total Diário (TMB ajustada pelo nível de atividade). */
export function calcularTDEE(m: BodyMetrics): number {
  return calcularTMB(m) * MULTIPLICADORES[m.activity_level];
}

/** Kcal totais a partir dos macros (proteína e carbo = 4 kcal/g, gordura = 9 kcal/g). */
export function calcularKcal(protein_g: number, carb_g: number, fat_g: number): number {
  return protein_g * 4 + carb_g * 4 + fat_g * 9;
}
