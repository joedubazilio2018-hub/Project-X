"use client";

import { useRef, useState } from "react";

const LARGURA_ACOES = 144; // espaço reservado para os 2 botões (px)

type SwipeRowProps = {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * Envolve um item de lista para revelar ações de Editar/Excluir:
 * - Mobile/touch: arrastar o item para a esquerda revela os botões
 *   (o conteúdo desliza, exatamente como antes)
 * - Desktop: passar o mouse por cima (hover) revela os botões com um
 *   FADE por cima, sem deslocar o conteúdo. Assim os cliques dentro do
 *   item (ex: confirmar pagamento) continuam caindo no lugar certo,
 *   mesmo com o mouse em cima da linha.
 */
export default function SwipeRow({ children, onEdit, onDelete }: SwipeRowProps) {
  const [offset, setOffset] = useState(0); // deslocamento atual (negativo = aberto, só touch)
  const arrastando = useRef(false);
  const inicioX = useRef(0);
  const offsetInicial = useRef(0);

  function comecar(clientX: number) {
    arrastando.current = true;
    inicioX.current = clientX;
    offsetInicial.current = offset;
  }

  function mover(clientX: number) {
    if (!arrastando.current) return;
    const delta = clientX - inicioX.current;
    let novo = offsetInicial.current + delta;
    novo = Math.max(-LARGURA_ACOES, Math.min(0, novo));
    setOffset(novo);
  }

  function soltar() {
    if (!arrastando.current) return;
    arrastando.current = false;
    setOffset((atual) => (atual < -LARGURA_ACOES / 2 ? -LARGURA_ACOES : 0));
  }

  function fechar() {
    setOffset(0);
  }

  const abertoPeloToque = offset !== 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-base-border">
      {/* Botões de ação: ficam sempre nessa posição (extremo direito).
          Por padrão invisíveis e sem capturar clique. Ficam visíveis:
          - no desktop, via CSS puro (:hover), com fade
          - no mobile, via JS, quando o usuário arrastou o item (abertoPeloToque) */}
      <div
        className={`absolute inset-y-0 right-0 z-10 flex transition-opacity duration-150 ${
          abertoPeloToque
            ? "opacity-100"
            : "pointer-events-none opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100"
        }`}
        style={{ width: LARGURA_ACOES }}
      >
        <button
          onClick={() => {
            fechar();
            onEdit();
          }}
          className="flex-1 bg-accent-dim text-xs font-semibold text-accent transition-opacity hover:opacity-90"
        >
          Editar
        </button>
        <button
          onClick={() => {
            fechar();
            onDelete();
          }}
          className="flex-1 bg-warn-dim text-xs font-semibold text-warn transition-opacity hover:opacity-90"
        >
          Excluir
        </button>
      </div>

      {/* Conteúdo do item. No desktop NÃO se move mais no hover — só o
          arrastar por toque (mobile) desloca ele para revelar os botões. */}
      <div
        className="relative bg-base-surface"
        style={
          abertoPeloToque
            ? {
                transform: `translateX(${offset}px)`,
                transition: arrastando.current ? "none" : "transform 0.2s ease-out",
              }
            : undefined
        }
        onTouchStart={(e) => comecar(e.touches[0].clientX)}
        onTouchMove={(e) => mover(e.touches[0].clientX)}
        onTouchEnd={soltar}
        onClick={() => {
          if (offset !== 0) fechar();
        }}
      >
        {children}
      </div>
    </div>
  );
}
