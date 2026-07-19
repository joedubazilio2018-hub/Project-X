"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type OpcoesConfirmacao = {
  titulo?: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  destrutivo?: boolean; // se true, o botão de confirmar usa a cor de aviso (warn) em vez da de destaque (accent)
};

type PedidoConfirmacao = OpcoesConfirmacao & {
  resolver: (confirmado: boolean) => void;
};

type ConfirmContextValue = {
  confirmar: (opcoes: OpcoesConfirmacao | string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue["confirmar"] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm precisa ser usado dentro de <ConfirmProvider>");
  }
  return ctx.confirmar;
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);
  const resolverEmAberto = useRef<((confirmado: boolean) => void) | null>(null);

  const confirmar = useCallback((opcoes: OpcoesConfirmacao | string): Promise<boolean> => {
    const normalizado: OpcoesConfirmacao =
      typeof opcoes === "string" ? { mensagem: opcoes } : opcoes;

    return new Promise((resolve) => {
      resolverEmAberto.current = resolve;
      setPedido({ ...normalizado, resolver: resolve });
    });
  }, []);

  function responder(confirmado: boolean) {
    resolverEmAberto.current?.(confirmado);
    resolverEmAberto.current = null;
    setPedido(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirmar }}>
      {children}
      {pedido && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-sm rounded-xl border border-base-border bg-base-surface p-5"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            {pedido.titulo && (
              <h2 className="mb-2 text-sm font-semibold text-ink">{pedido.titulo}</h2>
            )}
            <p className="text-sm text-ink-muted">{pedido.mensagem}</p>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => responder(false)}
                className="text-sm font-medium text-ink-muted hover:text-ink"
              >
                {pedido.textoCancelar ?? "Cancelar"}
              </button>
              <button
                type="button"
                onClick={() => responder(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 ${
                  pedido.destrutivo ? "bg-warn text-base" : "bg-accent text-base"
                }`}
              >
                {pedido.textoConfirmar ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
