"use client";

import { useState } from "react";

const LARGURA = 1080;
const ALTURA = 1080;

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

async function desenharTemplate(frase: string, explicacao: string): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");

  // Fundo com gradiente sutil (mesma paleta do app)
  const fundo = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
  fundo.addColorStop(0, "#0B0E14");
  fundo.addColorStop(1, "#12161F");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  // Glow decorativo (teal, cor de destaque do app)
  const glow = ctx.createRadialGradient(
    LARGURA / 2,
    ALTURA * 0.32,
    10,
    LARGURA / 2,
    ALTURA * 0.32,
    LARGURA * 0.65
  );
  glow.addColorStop(0, "rgba(45, 212, 191, 0.16)");
  glow.addColorStop(1, "rgba(45, 212, 191, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  // Aspas decorativas
  ctx.fillStyle = "rgba(45, 212, 191, 0.35)";
  ctx.font = "italic 900 160px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("\u201C", LARGURA * 0.1, ALTURA * 0.32);

  // Frase principal, centralizada e quebrada em linhas
  ctx.textAlign = "center";
  ctx.fillStyle = "#E7EAF0";
  let tamanhoFonte = 62;
  const maxLarguraTexto = LARGURA * 0.8;
  let linhas: string[] = [];

  do {
    ctx.font = `800 ${tamanhoFonte}px Arial, sans-serif`;
    linhas = quebrarLinhas(ctx, frase, maxLarguraTexto);
    if (linhas.length <= 5) break;
    tamanhoFonte -= 4;
  } while (tamanhoFonte > 34);

  const alturaLinha = tamanhoFonte * 1.28;
  const alturaBlocoTexto = linhas.length * alturaLinha;
  let yTexto = ALTURA * 0.44 - alturaBlocoTexto / 2 + alturaLinha / 2;

  linhas.forEach((linha) => {
    ctx.fillText(linha, LARGURA / 2, yTexto);
    yTexto += alturaLinha;
  });

  // Explicação, menor e mais discreta, abaixo da frase
  ctx.fillStyle = "#8B93A5";
  ctx.font = "500 32px Arial, sans-serif";
  const linhasExplicacao = quebrarLinhas(ctx, explicacao, LARGURA * 0.72).slice(0, 3);
  let yExplicacao = yTexto + 20;
  linhasExplicacao.forEach((linha) => {
    ctx.fillText(linha, LARGURA / 2, yExplicacao);
    yExplicacao += 44;
  });

  // Linha divisória sutil acima da assinatura
  ctx.strokeStyle = "rgba(139, 147, 165, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LARGURA * 0.38, ALTURA * 0.87);
  ctx.lineTo(LARGURA * 0.62, ALTURA * 0.87);
  ctx.stroke();

  // Logo + nome do app na base, como assinatura da marca
  try {
    const logo = await carregarImagem("/icon-512.png");
    const tamanhoLogo = 72;
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      LARGURA / 2 - 90,
      ALTURA * 0.93,
      tamanhoLogo / 2,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      logo,
      LARGURA / 2 - 90 - tamanhoLogo / 2,
      ALTURA * 0.93 - tamanhoLogo / 2,
      tamanhoLogo,
      tamanhoLogo
    );
    ctx.restore();
  } catch {
    // se o logo não carregar, segue só com o texto da marca
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#E7EAF0";
  ctx.font = "700 34px Arial, sans-serif";
  ctx.fillText("Ascen", LARGURA / 2 - 40, ALTURA * 0.93 + 12);

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
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  async function abrir() {
    setAberto(true);
    setGerando(true);
    setErro(false);
    try {
      const url = await desenharTemplate(frase, explicacao);
      setImagemUrl(url);
    } catch {
      setErro(true);
    } finally {
      setGerando(false);
    }
  }

  function fechar() {
    setAberto(false);
    setImagemUrl(null);
  }

  async function compartilhar() {
    if (!imagemUrl) return;
    try {
      const blob = await (await fetch(imagemUrl)).blob();
      const arquivo = new File([blob], "ascen-frase-do-dia.png", { type: "image/png" });
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
    link.download = "ascen-frase-do-dia.png";
    link.click();
  }

  return (
    <>
      <button
        onClick={abrir}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-base px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/10"
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

            <div className="mb-4 overflow-hidden rounded-xl border border-base-border bg-base">
              {gerando && (
                <div className="flex aspect-square items-center justify-center">
                  <p className="text-sm text-ink-muted">Gerando imagem...</p>
                </div>
              )}
              {!gerando && erro && (
                <div className="flex aspect-square items-center justify-center px-6 text-center">
                  <p className="text-sm text-warn">
                    Não deu pra gerar a imagem agora. Tenta de novo em instantes.
                  </p>
                </div>
              )}
              {!gerando && !erro && imagemUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagemUrl} alt="Prévia do card da frase do dia" className="w-full" />
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
