import { FRASES_DO_DIA, type FraseDoDia } from "./frases-do-dia";

/**
 * Retorna a frase motivacional do dia. O cálculo é determinístico: usa o
 * número de dias desde uma data fixa de referência como índice no banco de
 * frases. Isso garante que:
 * - A mesma frase aparece o dia todo (não muda a cada recarregamento)
 * - Cada dia mostra uma frase diferente da do dia anterior
 * - Depois de percorrer todo o banco, o ciclo reinicia do começo
 */
export function frasedoDia(): FraseDoDia {
  const referencia = new Date(2026, 0, 1); // 1º de janeiro de 2026, data fixa qualquer
  const hoje = new Date();

  const referenciaUTC = Date.UTC(
    referencia.getFullYear(),
    referencia.getMonth(),
    referencia.getDate()
  );
  const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const diasDesdeReferencia = Math.floor(
    (hojeUTC - referenciaUTC) / (1000 * 60 * 60 * 24)
  );

  const indice =
    ((diasDesdeReferencia % FRASES_DO_DIA.length) + FRASES_DO_DIA.length) %
    FRASES_DO_DIA.length;

  return FRASES_DO_DIA[indice];
}
