"use client";

import { useRef, useState } from "react";

const LARGURA_ACOES = 144; // espaço reservado para os 2 botões (px, só mobile)

type SwipeRowProps = {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * Envolve um item de lista para dar acesso a Editar/Excluir:
 * - Mobile/touch: arrastar o item para a esquerda revela os botões por
 *   baixo (overlay), exatamente como antes.
 * - Desktop: os botões ficam sempre visíveis, do lado de fora da linha
 *   (não sobrepõem o conteúdo). Assim, passar o mouse ou clicar em botões
 *   do próprio item (ex: marcar como concluído) nunca é interceptado.
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
    <div className="flex items-stretch gap-2">
      <div className="relative flex-1 overflow-hidden rounded-xl border border-base-border">
        {/* Botões de ação por baixo do conteúdo: só existem/funcionam no
            mobile (md:hidden), revelados ao arrastar o item pra esquerda.
            No desktop esse bloco nem é renderizado, então não tem como
            atrapalhar clique nenhum na linha. */}
        <div
          className={`absolute inset-y-0 right-0 z-10 flex md:hidden ${
            abertoPeloToque ? "opacity-100" : "pointer-events-none opacity-0"
          } transition-opacity duration-150`}
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

        {/* Conteúdo do item. Só desliza no mobile, quando arrastado. */}
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

      {/* Desktop: botões de Editar/Excluir sempre visíveis, fora da linha
          (não sobrepõem nada, então não atrapalham cliques no conteúdo). */}
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <button
          onClick={onEdit}
          aria-label="Editar"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-border text-ink-faint transition-colors hover:border-accent hover:text-accent"
        >
          ✎
        </button>
        <button
          onClick={onDelete}
          aria-label="Excluir"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-border text-ink-faint transition-colors hover:border-warn hover:text-warn"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
