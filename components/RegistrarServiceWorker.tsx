"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (public/sw.js) assim que o app carrega no
 * navegador. Necessário para o PWA funcionar e para habilitar notificações
 * push mais adiante. Não renderiza nada na tela.
 */
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((erro) => {
        console.error("Falha ao registrar service worker:", erro);
      });
    }
  }, []);

  return null;
}
