// Base de dados nutricional local (valores por 100g), inspirada na Tabela
// Brasileira de Composição de Alimentos (TACO) e em rótulos usuais.
// Serve para preencher automaticamente proteína, carboidrato e gordura
// quando o usuário digita um alimento na Dieta, sem depender de nenhuma API
// externa (rápido, offline e sem limite de requisições).

export type AlimentoBase = {
  nome: string;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

export const ALIMENTOS: AlimentoBase[] = [
  // Grãos, massas e tubérculos
  { nome: "Arroz branco cozido", kcal: 128, protein_g: 2.5, carb_g: 28.1, fat_g: 0.2 },
  { nome: "Arroz integral cozido", kcal: 124, protein_g: 2.6, carb_g: 25.8, fat_g: 1.0 },
  { nome: "Feijão preto cozido", kcal: 77, protein_g: 4.5, carb_g: 14.0, fat_g: 0.5 },
  { nome: "Feijão carioca cozido", kcal: 76, protein_g: 4.8, carb_g: 13.6, fat_g: 0.5 },
  { nome: "Lentilha cozida", kcal: 93, protein_g: 6.3, carb_g: 16.3, fat_g: 0.5 },
  { nome: "Grão de bico cozido", kcal: 121, protein_g: 6.5, carb_g: 20.0, fat_g: 1.9 },
  { nome: "Macarrão cozido", kcal: 158, protein_g: 5.8, carb_g: 31.0, fat_g: 0.9 },
  { nome: "Macarrão integral cozido", kcal: 148, protein_g: 5.3, carb_g: 30.9, fat_g: 0.7 },
  { nome: "Batata inglesa cozida", kcal: 52, protein_g: 1.2, carb_g: 11.9, fat_g: 0.1 },
  { nome: "Batata doce cozida", kcal: 77, protein_g: 1.3, carb_g: 18.4, fat_g: 0.1 },
  { nome: "Mandioca cozida", kcal: 125, protein_g: 0.6, carb_g: 30.1, fat_g: 0.3 },
  { nome: "Pão francês", kcal: 300, protein_g: 8.0, carb_g: 58.6, fat_g: 3.1 },
  { nome: "Pão de forma", kcal: 253, protein_g: 9.4, carb_g: 50.6, fat_g: 3.1 },
  { nome: "Pão integral", kcal: 253, protein_g: 9.7, carb_g: 49.9, fat_g: 3.4 },
  { nome: "Tapioca pronta", kcal: 129, protein_g: 0.2, carb_g: 31.9, fat_g: 0.0 },
  { nome: "Cuscuz de milho cozido", kcal: 112, protein_g: 2.2, carb_g: 25.0, fat_g: 0.2 },
  { nome: "Aveia em flocos", kcal: 394, protein_g: 13.9, carb_g: 67.0, fat_g: 8.5 },
  { nome: "Quinoa cozida", kcal: 120, protein_g: 4.4, carb_g: 21.3, fat_g: 1.9 },
  { nome: "Milho verde cozido", kcal: 98, protein_g: 3.4, carb_g: 21.0, fat_g: 1.5 },

  // Carnes, aves, peixes e ovos
  { nome: "Peito de frango grelhado", kcal: 165, protein_g: 31.0, carb_g: 0.0, fat_g: 3.6 },
  { nome: "Coxa de frango assada", kcal: 216, protein_g: 26.0, carb_g: 0.0, fat_g: 11.0 },
  { nome: "Frango desfiado cozido", kcal: 159, protein_g: 29.8, carb_g: 0.0, fat_g: 3.5 },
  { nome: "Carne bovina patinho grelhado", kcal: 219, protein_g: 35.0, carb_g: 0.0, fat_g: 8.0 },
  { nome: "Carne bovina moída cozida", kcal: 137, protein_g: 26.0, carb_g: 0.0, fat_g: 3.0 },
  { nome: "Picanha grelhada", kcal: 289, protein_g: 27.0, carb_g: 0.0, fat_g: 20.0 },
  { nome: "Carne de porco grelhada", kcal: 210, protein_g: 27.0, carb_g: 0.0, fat_g: 11.0 },
  { nome: "Bacon frito", kcal: 541, protein_g: 37.0, carb_g: 1.4, fat_g: 42.0 },
  { nome: "Filé de tilápia grelhado", kcal: 128, protein_g: 26.0, carb_g: 0.0, fat_g: 2.7 },
  { nome: "Salmão grelhado", kcal: 208, protein_g: 20.0, carb_g: 0.0, fat_g: 13.0 },
  { nome: "Atum em água (lata)", kcal: 116, protein_g: 26.0, carb_g: 0.0, fat_g: 1.0 },
  { nome: "Camarão cozido", kcal: 99, protein_g: 20.0, carb_g: 0.9, fat_g: 1.3 },
  { nome: "Ovo cozido", kcal: 155, protein_g: 13.0, carb_g: 1.1, fat_g: 11.0 },
  { nome: "Ovo frito", kcal: 196, protein_g: 13.6, carb_g: 0.8, fat_g: 15.0 },
  { nome: "Clara de ovo cozida", kcal: 52, protein_g: 11.0, carb_g: 0.7, fat_g: 0.2 },
  { nome: "Tofu", kcal: 76, protein_g: 8.0, carb_g: 1.9, fat_g: 4.8 },
  { nome: "Whey protein (pó)", kcal: 400, protein_g: 80.0, carb_g: 8.0, fat_g: 5.0 },

  // Laticínios
  { nome: "Leite integral", kcal: 61, protein_g: 3.2, carb_g: 4.8, fat_g: 3.3 },
  { nome: "Leite desnatado", kcal: 35, protein_g: 3.4, carb_g: 5.0, fat_g: 0.2 },
  { nome: "Iogurte natural integral", kcal: 61, protein_g: 3.5, carb_g: 4.7, fat_g: 3.0 },
  { nome: "Iogurte natural desnatado", kcal: 41, protein_g: 4.1, carb_g: 5.7, fat_g: 0.2 },
  { nome: "Iogurte grego natural", kcal: 97, protein_g: 9.0, carb_g: 3.9, fat_g: 5.0 },
  { nome: "Queijo minas frescal", kcal: 264, protein_g: 17.4, carb_g: 3.2, fat_g: 20.0 },
  { nome: "Queijo mussarela", kcal: 280, protein_g: 22.0, carb_g: 3.2, fat_g: 20.0 },
  { nome: "Queijo prato", kcal: 360, protein_g: 24.0, carb_g: 1.9, fat_g: 29.0 },
  { nome: "Requeijão", kcal: 257, protein_g: 9.6, carb_g: 3.0, fat_g: 24.0 },
  { nome: "Cottage", kcal: 98, protein_g: 11.0, carb_g: 3.4, fat_g: 4.3 },

  // Frutas
  { nome: "Banana prata", kcal: 98, protein_g: 1.3, carb_g: 26.0, fat_g: 0.1 },
  { nome: "Maçã", kcal: 52, protein_g: 0.3, carb_g: 14.0, fat_g: 0.2 },
  { nome: "Laranja", kcal: 45, protein_g: 0.9, carb_g: 11.5, fat_g: 0.1 },
  { nome: "Mamão papaia", kcal: 40, protein_g: 0.5, carb_g: 10.0, fat_g: 0.1 },
  { nome: "Morango", kcal: 32, protein_g: 0.7, carb_g: 7.7, fat_g: 0.3 },
  { nome: "Abacate", kcal: 96, protein_g: 1.2, carb_g: 6.0, fat_g: 8.4 },
  { nome: "Uva", kcal: 69, protein_g: 0.6, carb_g: 18.0, fat_g: 0.2 },
  { nome: "Manga", kcal: 60, protein_g: 0.4, carb_g: 15.0, fat_g: 0.2 },
  { nome: "Melancia", kcal: 33, protein_g: 0.6, carb_g: 8.1, fat_g: 0.2 },
  { nome: "Abacaxi", kcal: 50, protein_g: 0.9, carb_g: 13.0, fat_g: 0.1 },
  { nome: "Pera", kcal: 53, protein_g: 0.4, carb_g: 13.8, fat_g: 0.1 },
  { nome: "Melão", kcal: 29, protein_g: 0.7, carb_g: 7.5, fat_g: 0.1 },

  // Vegetais e legumes
  { nome: "Brócolis cozido", kcal: 25, protein_g: 2.1, carb_g: 4.0, fat_g: 0.3 },
  { nome: "Alface", kcal: 15, protein_g: 1.4, carb_g: 2.4, fat_g: 0.2 },
  { nome: "Tomate", kcal: 18, protein_g: 0.9, carb_g: 3.9, fat_g: 0.2 },
  { nome: "Cenoura cozida", kcal: 34, protein_g: 0.8, carb_g: 8.0, fat_g: 0.2 },
  { nome: "Abobrinha cozida", kcal: 17, protein_g: 1.2, carb_g: 3.0, fat_g: 0.3 },
  { nome: "Couve refogada", kcal: 39, protein_g: 2.0, carb_g: 4.0, fat_g: 2.0 },
  { nome: "Espinafre cozido", kcal: 23, protein_g: 2.9, carb_g: 3.6, fat_g: 0.4 },
  { nome: "Beterraba cozida", kcal: 44, protein_g: 1.7, carb_g: 10.0, fat_g: 0.2 },
  { nome: "Pepino", kcal: 12, protein_g: 0.7, carb_g: 2.5, fat_g: 0.1 },
  { nome: "Chuchu cozido", kcal: 19, protein_g: 0.6, carb_g: 4.5, fat_g: 0.1 },
  { nome: "Repolho cru", kcal: 25, protein_g: 1.3, carb_g: 5.7, fat_g: 0.1 },
  { nome: "Berinjela cozida", kcal: 20, protein_g: 0.7, carb_g: 4.7, fat_g: 0.1 },

  // Gorduras, oleaginosas e untuosos
  { nome: "Azeite de oliva", kcal: 884, protein_g: 0.0, carb_g: 0.0, fat_g: 100.0 },
  { nome: "Óleo de soja", kcal: 884, protein_g: 0.0, carb_g: 0.0, fat_g: 100.0 },
  { nome: "Manteiga", kcal: 717, protein_g: 0.9, carb_g: 0.1, fat_g: 81.0 },
  { nome: "Castanha do pará", kcal: 656, protein_g: 14.3, carb_g: 12.0, fat_g: 66.0 },
  { nome: "Castanha de caju", kcal: 570, protein_g: 18.2, carb_g: 30.0, fat_g: 46.0 },
  { nome: "Amendoim", kcal: 567, protein_g: 25.8, carb_g: 16.0, fat_g: 49.0 },
  { nome: "Pasta de amendoim", kcal: 588, protein_g: 25.0, carb_g: 20.0, fat_g: 50.0 },
  { nome: "Amêndoas", kcal: 579, protein_g: 21.2, carb_g: 22.0, fat_g: 50.0 },
  { nome: "Nozes", kcal: 654, protein_g: 15.2, carb_g: 14.0, fat_g: 65.0 },

  // Doces e outros
  { nome: "Chocolate ao leite", kcal: 540, protein_g: 7.3, carb_g: 59.0, fat_g: 30.0 },
  { nome: "Mel", kcal: 304, protein_g: 0.3, carb_g: 82.0, fat_g: 0.0 },
  { nome: "Açúcar refinado", kcal: 387, protein_g: 0.0, carb_g: 99.8, fat_g: 0.0 },
  { nome: "Granola", kcal: 471, protein_g: 10.0, carb_g: 64.0, fat_g: 19.0 },
  { nome: "Barra de cereal", kcal: 390, protein_g: 6.0, carb_g: 72.0, fat_g: 8.0 },

  // Bebidas
  { nome: "Café sem açúcar", kcal: 2, protein_g: 0.1, carb_g: 0.0, fat_g: 0.0 },
  { nome: "Café com açúcar", kcal: 20, protein_g: 0.1, carb_g: 5.0, fat_g: 0.0 },
  { nome: "Café com leite sem açúcar", kcal: 38, protein_g: 1.9, carb_g: 3.0, fat_g: 1.9 },
  { nome: "Café com leite e açúcar", kcal: 55, protein_g: 1.7, carb_g: 7.5, fat_g: 1.7 },
  { nome: "Cappuccino", kcal: 65, protein_g: 2.5, carb_g: 8.0, fat_g: 2.5 },
  { nome: "Chá sem açúcar", kcal: 1, protein_g: 0.0, carb_g: 0.2, fat_g: 0.0 },
  { nome: "Achocolatado pronto (caixinha)", kcal: 65, protein_g: 1.4, carb_g: 11.0, fat_g: 1.6 },
  { nome: "Leite com achocolatado em pó", kcal: 85, protein_g: 3.0, carb_g: 13.0, fat_g: 2.5 },
  { nome: "Vitamina de banana com leite", kcal: 85, protein_g: 2.8, carb_g: 14.0, fat_g: 2.0 },
  { nome: "Suco de laranja natural", kcal: 45, protein_g: 0.7, carb_g: 10.4, fat_g: 0.2 },
  { nome: "Suco de laranja com açúcar", kcal: 55, protein_g: 0.5, carb_g: 13.5, fat_g: 0.1 },
  { nome: "Refrigerante comum", kcal: 42, protein_g: 0.0, carb_g: 10.6, fat_g: 0.0 },
  { nome: "Refrigerante zero", kcal: 0.3, protein_g: 0.0, carb_g: 0.1, fat_g: 0.0 },
  { nome: "Cerveja pilsen", kcal: 43, protein_g: 0.5, carb_g: 3.6, fat_g: 0.0 },

  // Pães e lanches do dia a dia
  { nome: "Pão com manteiga", kcal: 330, protein_g: 8.5, carb_g: 55.0, fat_g: 10.0 },
  { nome: "Pão com margarina", kcal: 320, protein_g: 8.3, carb_g: 55.0, fat_g: 9.0 },
  { nome: "Pão na chapa", kcal: 335, protein_g: 8.6, carb_g: 55.0, fat_g: 10.5 },
  { nome: "Misto quente", kcal: 290, protein_g: 12.0, carb_g: 32.0, fat_g: 13.0 },
  { nome: "Pão de queijo", kcal: 350, protein_g: 6.0, carb_g: 34.0, fat_g: 21.0 },
  { nome: "Pizza de mussarela", kcal: 266, protein_g: 11.0, carb_g: 33.0, fat_g: 10.0 },
  { nome: "Hambúrguer caseiro com queijo", kcal: 295, protein_g: 17.0, carb_g: 24.0, fat_g: 15.0 },
  { nome: "Cachorro-quente completo", kcal: 250, protein_g: 9.0, carb_g: 24.0, fat_g: 13.0 },
  { nome: "Coxinha de frango frita", kcal: 300, protein_g: 9.0, carb_g: 28.0, fat_g: 17.0 },
  { nome: "Pastel de carne frito", kcal: 320, protein_g: 8.0, carb_g: 30.0, fat_g: 19.0 },
  { nome: "Esfiha de carne aberta", kcal: 260, protein_g: 10.0, carb_g: 28.0, fat_g: 12.0 },
  { nome: "Sanduíche natural de frango", kcal: 200, protein_g: 12.0, carb_g: 22.0, fat_g: 7.0 },
  { nome: "Torrada integral", kcal: 407, protein_g: 12.0, carb_g: 74.0, fat_g: 6.5 },
  { nome: "Tapioca com queijo e coco", kcal: 210, protein_g: 5.0, carb_g: 33.0, fat_g: 7.0 },

  // Doces e sobremesas
  { nome: "Bolo simples", kcal: 371, protein_g: 5.6, carb_g: 55.0, fat_g: 14.0 },
  { nome: "Brigadeiro", kcal: 411, protein_g: 4.5, carb_g: 60.0, fat_g: 17.0 },
  { nome: "Pudim de leite", kcal: 205, protein_g: 5.0, carb_g: 32.0, fat_g: 6.0 },
  { nome: "Sorvete de massa", kcal: 207, protein_g: 3.5, carb_g: 24.0, fat_g: 11.0 },
  { nome: "Açaí puro (polpa)", kcal: 58, protein_g: 0.8, carb_g: 6.2, fat_g: 3.9 },
  { nome: "Açaí na tigela com granola e banana", kcal: 150, protein_g: 2.0, carb_g: 24.0, fat_g: 5.0 },

  // Salgados e frituras
  { nome: "Batata frita", kcal: 312, protein_g: 3.4, carb_g: 41.0, fat_g: 15.0 },
  { nome: "Pipoca de sal (sem óleo)", kcal: 375, protein_g: 11.0, carb_g: 78.0, fat_g: 4.5 },
  { nome: "Pipoca amanteigada", kcal: 480, protein_g: 8.0, carb_g: 57.0, fat_g: 27.0 },

  // Pratos prontos e refeições comuns
  { nome: "Omelete de queijo", kcal: 235, protein_g: 16.0, carb_g: 1.5, fat_g: 18.0 },
  { nome: "Feijoada", kcal: 220, protein_g: 14.0, carb_g: 12.0, fat_g: 13.0 },
  { nome: "Strogonoff de frango", kcal: 195, protein_g: 14.0, carb_g: 8.0, fat_g: 12.0 },
  { nome: "Lasanha à bolonhesa", kcal: 190, protein_g: 9.0, carb_g: 18.0, fat_g: 9.0 },
  { nome: "Salada de frutas", kcal: 55, protein_g: 0.6, carb_g: 14.0, fat_g: 0.2 },
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Extrai uma quantidade em gramas do fim de um texto, ex: "arroz branco 150g"
 * -> { termo: "arroz branco", gramas: 150 }. Se não houver quantidade, retorna
 * o texto original e gramas null.
 */
export function extrairQuantidade(texto: string): { termo: string; gramas: number | null } {
  // Quantidade no fim, ex: "arroz branco 150g"
  const noFim = texto.match(/^(.*?)[\s,]*(\d+(?:[.,]\d+)?)\s*(g|gr|gramas|kg)\.?\s*$/i);
  if (noFim) {
    const termo = noFim[1].trim();
    let valor = parseFloat(noFim[2].replace(",", "."));
    if (noFim[3].toLowerCase() === "kg") valor *= 1000;
    return { termo: termo || texto.trim(), gramas: valor };
  }

  // Quantidade no começo, ex: "150g de frango" ou "150g frango"
  const noComeco = texto.match(/^\s*(\d+(?:[.,]\d+)?)\s*(g|gr|gramas|kg)\.?\s+(?:de\s+)?(.+)$/i);
  if (noComeco) {
    const termo = noComeco[3].trim();
    let valor = parseFloat(noComeco[1].replace(",", "."));
    if (noComeco[2].toLowerCase() === "kg") valor *= 1000;
    return { termo: termo || texto.trim(), gramas: valor };
  }

  return { termo: texto.trim(), gramas: null };
}

/**
 * Busca alimentos no banco local por nome, aceitando qualquer ordem das
 * palavras (ex: "grelhado frango" encontra "Peito de frango grelhado").
 */
export function buscarAlimentos(termoBusca: string, limite = 6): AlimentoBase[] {
  const termo = normalizar(termoBusca);
  if (!termo) return [];

  const palavras = termo.split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];

  const resultados = ALIMENTOS.filter((alimento) => {
    const nomeNormalizado = normalizar(alimento.nome);
    return palavras.every((palavra) => nomeNormalizado.includes(palavra));
  });

  // Prioriza nomes mais curtos (tende a ser o resultado mais direto)
  resultados.sort((a, b) => a.nome.length - b.nome.length);

  return resultados.slice(0, limite);
}

/**
 * Calcula os macros absolutos (em gramas/kcal) de um alimento para uma
 * quantidade específica, a partir dos valores por 100g.
 */
export function calcularMacrosPorQuantidade(alimento: AlimentoBase, gramas: number) {
  const fator = gramas / 100;
  return {
    kcal: Math.round(alimento.kcal * fator),
    protein_g: Math.round(alimento.protein_g * fator * 10) / 10,
    carb_g: Math.round(alimento.carb_g * fator * 10) / 10,
    fat_g: Math.round(alimento.fat_g * fator * 10) / 10,
  };
}
