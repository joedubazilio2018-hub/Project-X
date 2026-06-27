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
 * - Desktop: passar o mouse por cima (hover) revela os mesmos botões,
 *   sem precisar arrastar
 */
export default function SwipeRow({ children, onEdit, onDelete }: SwipeRowProps) {
  const [offset, setOffset] = useState(0); // deslocamento atual (negativo = aberto)
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

  // Se o item já foi arrastado pelo toque, esse deslocamento manda (JS).
  // Caso contrário (offset 0), o hover do desktop assume via CSS puro.
  const usandoOffsetManual = offset !== 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-base-border">
      {/* Botões de ação, revelados por baixo */}
      <div
        className="absolute inset-y-0 right-0 flex"
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

      {/* Conteúdo arrastável (touch) / revelado por hover (desktop) */}
      <div
        className={
          usandoOffsetManual
            ? "relative bg-base-surface"
            : "relative bg-base-surface transition-transform duration-200 md:group-hover:-translate-x-36"
        }
        style={
          usandoOffsetManual
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
