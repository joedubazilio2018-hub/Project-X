"use client";

import { useState } from "react";

type Formato = "feed" | "stories";

const CONFIG: Record<
  Formato,
  {
    largura: number;
    altura: number;
    aspasY: number;
    quoteCenterY: number;
    dividerY: number;
    logoY: number;
    glowY: number;
    glowRaio: number;
  }
> = {
  feed: {
    largura: 1080,
    altura: 1080,
    aspasY: 0.32,
    quoteCenterY: 0.44,
    dividerY: 0.87,
    logoY: 0.93,
    glowY: 0.32,
    glowRaio: 0.65,
  },
  stories: {
    largura: 1080,
    altura: 1920,
    aspasY: 0.27,
    quoteCenterY: 0.46,
    dividerY: 0.86,
    logoY: 0.905,
    glowY: 0.3,
    glowRaio: 0.6,
  },
};

function quebrarLinhas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  maxLargura: number
): string[] {
  const palavras = texto.split(" ");
  const linhas: string[] = [];
  let linhaAtual = "";

  for (const palavra of palavras) {
    const tentativa = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width > maxLargura && linhaAtual) {
      linhas.push(linhaAtual);
      linhaAtual = palavra;
    } else {
      linhaAtual = tentativa;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);
  return linhas;
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function desenharTemplate(
  frase: string,
  explicacao: string,
  formato: Formato
): Promise<string> {
  const cfg = CONFIG[formato];
  const { largura, altura } = cfg;

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");

  // Fundo quase preto, com leve gradiente — mesmo tom escuro do logo
  const fundo = ctx.createLinearGradient(0, 0, largura, altura);
  fundo.addColorStop(0, "#000000");
  fundo.addColorStop(1, "#14141a");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, largura, altura);

  // Glow decorativo suave em branco, discreto, sem cor
  const glow = ctx.createRadialGradient(
    largura / 2,
    altura * cfg.glowY,
    10,
    largura / 2,
    altura * cfg.glowY,
    largura * cfg.glowRaio
  );
  glow.addColorStop(0, "rgba(255, 255, 255, 0.07)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, largura, altura);

  // Moldura fina, ecoando o traço circular do logo
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, largura - 56, altura - 56);

  // Aspas decorativas
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.font = "italic 900 160px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("\u201C", largura * 0.1, altura * cfg.aspasY);

  // Frase principal, centralizada e quebrada em linhas
  ctx.textAlign = "center";
  ctx.fillStyle = "#F2F2F2";
  let tamanhoFonte = 62;
  const maxLarguraTexto = largura * 0.8;
  let linhas: string[] = [];

  do {
    ctx.font = `800 ${tamanhoFonte}px Arial, sans-serif`;
    linhas = quebrarLinhas(ctx, frase, maxLarguraTexto);
    if (linhas.length <= 5) break;
    tamanhoFonte -= 4;
  } while (tamanhoFonte > 34);

  const alturaLinha = tamanhoFonte * 1.28;
  const alturaBlocoTexto = linhas.length * alturaLinha;
  let yTexto = altura * cfg.quoteCenterY - alturaBlocoTexto / 2 + alturaLinha / 2;

  linhas.forEach((linha) => {
    ctx.fillText(linha, largura / 2, yTexto);
    yTexto += alturaLinha;
  });

  // Explicação, menor e mais discreta, abaixo da frase
  ctx.fillStyle = "#9A9A9F";
  ctx.font = "500 32px Arial, sans-serif";
  const linhasExplicacao = quebrarLinhas(ctx, explicacao, largura * 0.72).slice(0, 3);
  let yExplicacao = yTexto + 20;
  linhasExplicacao.forEach((linha) => {
    ctx.fillText(linha, largura / 2, yExplicacao);
    yExplicacao += 44;
  });

  // Linha divisória sutil acima da assinatura
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(largura * 0.38, altura * cfg.dividerY);
  ctx.lineTo(largura * 0.62, altura * cfg.dividerY);
  ctx.stroke();

  // Logo + nome do app na base, como assinatura da marca
  try {
    const logo = await carregarImagem("/logo-mark.png");
    const tamanhoLogo = 76;
    ctx.save();
    ctx.beginPath();
    ctx.arc(largura / 2 - 92, altura * cfg.logoY, tamanhoLogo / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      logo,
      largura / 2 - 92 - tamanhoLogo / 2,
      altura * cfg.logoY - tamanhoLogo / 2,
      tamanhoLogo,
      tamanhoLogo
    );
    ctx.restore();
  } catch {
    // se o logo não carregar, segue só com o texto da marca
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#F2F2F2";
  ctx.font = "700 34px Arial, sans-serif";
  ctx.fillText("ASCEN", largura / 2 - 40, altura * cfg.logoY + 12);

  return canvas.toDataURL("image/png");
}

export default function CompartilharFrase({
  frase,
  explicacao,
}: {
  frase: string;
  explicacao: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [formato, setFormato] = useState<Formato>("stories");
  const [imagens, setImagens] = useState<Partial<Record<Formato, string>>>({});
  const [erro, setErro] = useState(false);

  async function gerar(alvo: Formato, imagensAtuais: Partial<Record<Formato, string>>) {
    if (imagensAtuais[alvo]) return imagensAtuais[alvo]!;
    const url = await desenharTemplate(frase, explicacao, alvo);
    return url;
  }

  async function abrir() {
    setAberto(true);
    setGerando(true);
    setErro(false);
    try {
      const url = await gerar(formato, imagens);
      setImagens((prev) => ({ ...prev, [formato]: url }));
    } catch {
      setErro(true);
    } finally {
      setGerando(false);
    }
  }

  async function trocarFormato(novoFormato: Formato) {
    setFormato(novoFormato);
    if (imagens[novoFormato]) return;
    setGerando(true);
    setErro(false);
    try {
      const url = await desenharTemplate(frase, explicacao, novoFormato);
      setImagens((prev) => ({ ...prev, [novoFormato]: url }));
    } catch {
      setErro(true);
    } finally {
      setGerando(false);
    }
  }

  function fechar() {
    setAberto(false);
    setImagens({});
  }

  const imagemUrl = imagens[formato] ?? null;

  async function compartilhar() {
    if (!imagemUrl) return;
    try {
      const blob = await (await fetch(imagemUrl)).blob();
      const arquivo = new File([blob], `ascen-frase-do-dia-${formato}.png`, {
        type: "image/png",
      });
      if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({
          files: [arquivo],
          title: "Frase do dia — Ascen",
        });
        return;
      }
    } catch {
      // se o compartilhamento nativo falhar ou for cancelado, cai no download
    }
    baixar();
  }

  function baixar() {
    if (!imagemUrl) return;
    const link = document.createElement("a");
    link.href = imagemUrl;
    link.download = `ascen-frase-do-dia-${formato}.png`;
    link.click();
  }

  return (
    <>
      <button
        onClick={abrir}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-ink-faint/30 bg-base px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-ink-faint/10 hover:text-ink"
      >
        <span aria-hidden>📤</span>
        Postar nas redes
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            onClick={fechar}
            className="absolute inset-0 bg-black/70"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-base-border bg-base-surface p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Compartilhar frase do dia</h3>
              <button
                onClick={fechar}
                aria-label="Fechar"
                className="text-ink-faint hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <button
                onClick={() => trocarFormato("stories")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                  formato === "stories"
                    ? "bg-ink text-base"
                    : "border border-base-border text-ink-muted hover:text-ink"
                }`}
              >
                Stories (9:16)
              </button>
              <button
                onClick={() => trocarFormato("feed")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                  formato === "feed"
                    ? "bg-ink text-base"
                    : "border border-base-border text-ink-muted hover:text-ink"
                }`}
              >
                Feed (quadrado)
              </button>
            </div>

            <div
              className={`mb-4 overflow-hidden rounded-xl border border-base-border bg-base ${
                formato === "stories" ? "aspect-[9/16]" : "aspect-square"
              }`}
            >
              {gerando && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-ink-muted">Gerando imagem...</p>
                </div>
              )}
              {!gerando && erro && (
                <div className="flex h-full items-center justify-center px-6 text-center">
                  <p className="text-sm text-warn">
                    Não deu pra gerar a imagem agora. Tenta de novo em instantes.
                  </p>
                </div>
              )}
              {!gerando && !erro && imagemUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagemUrl} alt="Prévia do card da frase do dia" className="h-full w-full object-contain" />
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={compartilhar}
                disabled={gerando || erro || !imagemUrl}
                className="flex-1 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-base disabled:opacity-40"
              >
                Compartilhar
              </button>
              <button
                onClick={baixar}
                disabled={gerando || erro || !imagemUrl}
                className="flex-1 rounded-lg border border-base-border px-3 py-2.5 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-40"
              >
                Baixar imagem
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
