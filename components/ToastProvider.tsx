"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type TipoToast = "erro" | "sucesso" | "conquista";

type ToastItem = {
  id: number;
  mensagem: string;
  tipo: TipoToast;
};

type ToastContextValue = {
  mostrarToast: (mensagem: string, tipo?: TipoToast) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast precisa ser usado dentro de <ToastProvider>");
  }
  return ctx;
}

const DURACAO_MS = 4500;

const ESTILO_POR_TIPO: Record<TipoToast, string> = {
  erro: "border-warn/40 bg-warn-dim text-warn",
  sucesso: "border-accent/40 bg-accent-dim text-accent",
  conquista: "border-accent/40 bg-accent-dim text-accent",
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const proximoId = useRef(0);

  const mostrarToast = useCallback((mensagem: string, tipo: TipoToast = "erro") => {
    const id = proximoId.current++;
    setToasts((prev) => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, DURACAO_MS);
  }, []);

  function fechar(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${ESTILO_POR_TIPO[t.tipo]}`}
          >
            <span className="flex-1">{t.mensagem}</span>
            <button
              onClick={() => fechar(t.id)}
              aria-label="Fechar aviso"
              className="opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
