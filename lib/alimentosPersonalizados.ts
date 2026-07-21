// Alimentos personalizados (criados pelo usuário) e histórico alimentar,
// usados pra sugerir itens "recentes" e "frequentes" na Dieta, complementando
// a base fixa de lib/alimentos.ts (Fase 4 do roadmap estilo MyFitnessPal).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlimentoBase } from "@/lib/alimentos";

export type AlimentoPersonalizado = AlimentoBase & {
  id: string;
  user_id: string;
  created_at: string;
};

export type ItemHistorico = {
  name: string;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  created_at: string;
};

/** Lista todos os alimentos personalizados do usuário, ordenados por nome. */
export async function listarAlimentosPersonalizados(
  supabase: SupabaseClient,
  userId: string
): Promise<AlimentoPersonalizado[]> {
  const { data, error } = await supabase
    .from("alimentos_personalizados")
    .select("*")
    .eq("user_id", userId)
    .order("nome", { ascending: true });

  if (error || !data) return [];
  return data as AlimentoPersonalizado[];
}

/** Filtra alimentos personalizados já carregados cujo nome contém o termo. */
export function buscarAlimentosPersonalizados(
  lista: AlimentoPersonalizado[],
  termo: string,
  limite = 6
): AlimentoPersonalizado[] {
  const termoNormalizado = termo.trim().toLowerCase();
  if (termoNormalizado.length < 2) return [];
  return lista.filter((a) => a.nome.toLowerCase().includes(termoNormalizado)).slice(0, limite);
}

/** Cria um novo alimento personalizado (valores sempre por 100g). */
export async function criarAlimentoPersonalizado(
  supabase: SupabaseClient,
  userId: string,
  dados: { nome: string; kcal: number; protein_g: number; carb_g: number; fat_g: number }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("alimentos_personalizados").insert({
    user_id: userId,
    nome: dados.nome.trim(),
    kcal: dados.kcal,
    protein_g: dados.protein_g,
    carb_g: dados.carb_g,
    fat_g: dados.fat_g,
  });
  return { error: error ? error.message : null };
}

/** Exclui um alimento personalizado do usuário. */
export async function excluirAlimentoPersonalizado(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("alimentos_personalizados").delete().eq("id", id);
  return { error: error ? error.message : null };
}

/**
 * Busca o histórico recente de itens de refeição do usuário (últimos ~90
 * dias). Uma única consulta serve de base pras listas de "recentes" e
 * "frequentes", evitando duas idas ao banco.
 */
export async function buscarHistoricoAlimentar(
  supabase: SupabaseClient,
  userId: string,
  limite = 300
): Promise<ItemHistorico[]> {
  const noventaDiasAtras = new Date();
  noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90);

  const { data, error } = await supabase
    .from("meal_items")
    .select("name, protein_g, carb_g, fat_g, created_at")
    .eq("user_id", userId)
    .gte("created_at", noventaDiasAtras.toISOString())
    .order("created_at", { ascending: false })
    .limit(limite);

  if (error || !data) return [];
  return data as ItemHistorico[];
}

/** Últimos alimentos distintos usados, do mais recente pro mais antigo. */
export function derivarRecentes(historico: ItemHistorico[], limite = 8): ItemHistorico[] {
  const vistos = new Set<string>();
  const resultado: ItemHistorico[] = [];
  for (const item of historico) {
    const chave = item.name.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push(item);
    if (resultado.length >= limite) break;
  }
  return resultado;
}

/** Alimentos mais repetidos no histórico, com a última quantidade usada. */
export function derivarFrequentes(historico: ItemHistorico[], limite = 8): ItemHistorico[] {
  const contagem = new Map<string, { item: ItemHistorico; vezes: number }>();
  for (const item of historico) {
    const chave = item.name.toLowerCase();
    const atual = contagem.get(chave);
    if (atual) {
      atual.vezes += 1;
    } else {
      contagem.set(chave, { item, vezes: 1 });
    }
  }
  return Array.from(contagem.values())
    .sort((a, b) => b.vezes - a.vezes)
    .slice(0, limite)
    .map((c) => c.item);
}
