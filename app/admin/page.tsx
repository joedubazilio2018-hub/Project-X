"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";

const MSG_ERRO_PADRAO = "Não deu pra salvar agora. Tenta de novo em instantes.";

type InviteCode = {
  id: string;
  code: string;
  max_uses: number;
  uses_count: number;
  active: boolean;
  expires_at: string | null;
  note: string | null;
  created_at: string;
};

function gerarCodigoAleatorio(): string {
  // Gera um código curto e fácil de digitar/compartilhar, ex: ASC-7K9P2M
  // (sem O, 0, I, 1 para evitar confusão visual ao digitar)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let sufixo = "";
  for (let i = 0; i < 6; i++) {
    sufixo += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ASC-${sufixo}`;
}

export default function AdminPage() {
  const supabase = createClient();
  const { mostrarToast } = useToast();
  const [verificandoAdmin, setVerificandoAdmin] = useState(true);
  const [souAdmin, setSouAdmin] = useState(false);

  const [codigos, setCodigos] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoCodigo, setNovoCodigo] = useState(gerarCodigoAleatorio());
  const [maxUsos, setMaxUsos] = useState("1");
  const [validade, setValidade] = useState("");
  const [nota, setNota] = useState("");

  useEffect(() => {
    supabase.rpc("is_admin").then(({ data, error }) => {
      setSouAdmin(!error && data === true);
      setVerificandoAdmin(false);
    });
  }, [supabase]);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("invite_codes")
      .select("*")
      .order("created_at", { ascending: false });
    setCodigos((data as InviteCode[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (souAdmin) carregar();
  }, [souAdmin, carregar]);

  async function criarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (!novoCodigo.trim()) return;
    setSalvando(true);

    const { error } = await supabase.from("invite_codes").insert({
      code: novoCodigo.trim().toUpperCase(),
      max_uses: Math.max(1, parseInt(maxUsos, 10) || 1),
      expires_at: validade || null,
      note: nota.trim() || null,
    });

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      setSalvando(false);
      return;
    }

    setNovoCodigo(gerarCodigoAleatorio());
    setMaxUsos("1");
    setValidade("");
    setNota("");
    setMostrarForm(false);
    setSalvando(false);
    carregar();
  }

  async function alternarAtivo(codigo: InviteCode) {
    setCodigos((prev) =>
      prev.map((c) => (c.id === codigo.id ? { ...c, active: !c.active } : c))
    );
    const { error } = await supabase
      .from("invite_codes")
      .update({ active: !codigo.active })
      .eq("id", codigo.id);

    if (error) {
      setCodigos((prev) =>
        prev.map((c) => (c.id === codigo.id ? { ...c, active: codigo.active } : c))
      );
      mostrarToast(MSG_ERRO_PADRAO);
    }
  }

  async function excluirCodigo(id: string) {
    const codigoRemovido = codigos.find((c) => c.id === id) ?? null;
    setCodigos((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from("invite_codes").delete().eq("id", id);
    if (error) {
      if (codigoRemovido) setCodigos((prev) => [...prev, codigoRemovido]);
      mostrarToast(MSG_ERRO_PADRAO);
    }
  }

  function copiar(codigo: string) {
    navigator.clipboard?.writeText(codigo);
  }

  function formatarData(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  if (verificandoAdmin) {
    return (
      <AppShell>
        <p className="text-sm text-ink-muted">Verificando permissões...</p>
      </AppShell>
    );
  }

  if (!souAdmin) {
    return (
      <AppShell>
        <div className="rounded-xl border border-warn/40 bg-warn-dim p-6 text-center">
          <p className="text-sm font-medium text-warn">Acesso restrito.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Admin</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Gerencie os códigos de convite do Ascen.
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          {mostrarForm ? "Cancelar" : "+ Novo código"}
        </button>
      </header>

      {mostrarForm && (
        <form
          onSubmit={criarCodigo}
          className="mb-6 flex flex-col gap-3 rounded-xl border border-base-border bg-base-surface p-5"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm text-ink-muted">Código</label>
            <div className="flex gap-2">
              <input
                value={novoCodigo}
                onChange={(e) => setNovoCodigo(e.target.value.toUpperCase())}
                className="flex-1 rounded-lg border border-base-border bg-base px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                required
              />
              <button
                type="button"
                onClick={() => setNovoCodigo(gerarCodigoAleatorio())}
                className="rounded-lg border border-base-border px-3 text-xs text-ink-muted hover:border-accent hover:text-accent"
              >
                Gerar novo
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-ink-muted">Limite de usos</label>
              <input
                type="number"
                min={1}
                value={maxUsos}
                onChange={(e) => setMaxUsos(e.target.value)}
                className="w-full rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
              <p className="mt-1 text-xs text-ink-faint">1 = uso único</p>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm text-ink-muted">Expira em (opcional)</label>
              <input
                type="date"
                value={validade}
                onChange={(e) => setValidade(e.target.value)}
                className="w-full rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink-muted">
              Nota (opcional, só você vê)
            </label>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex: convite para o João da academia"
              className="w-full rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Criar código
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : codigos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
          <p className="text-sm text-ink-muted">Nenhum código criado ainda.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {codigos.map((c) => {
            const esgotado = c.uses_count >= c.max_uses;
            const expirado = c.expires_at ? new Date(c.expires_at) <= new Date() : false;
            const statusInativo = !c.active || esgotado || expirado;
            return (
              <li
                key={c.id}
                className="group rounded-xl border border-base-border bg-base-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-sm font-semibold ${
                        statusInativo ? "text-ink-faint line-through" : "text-ink"
                      }`}
                    >
                      {c.code}
                    </span>
                    <button
                      onClick={() => copiar(c.code)}
                      className="text-xs text-ink-faint hover:text-accent"
                    >
                      copiar
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-ink-muted">
                      {c.uses_count}/{c.max_uses} usados
                    </span>
                    {expirado && <span className="text-warn">Expirado</span>}
                    {esgotado && !expirado && <span className="text-warn">Esgotado</span>}
                    {!c.active && <span className="text-ink-faint">Desativado</span>}
                    <span className="text-ink-faint">Val.: {formatarData(c.expires_at)}</span>
                  </div>
                </div>
                {c.note && <p className="mt-1.5 text-xs text-ink-faint">{c.note}</p>}
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => alternarAtivo(c)}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    {c.active ? "Desativar" : "Reativar"}
                  </button>
                  <button
                    onClick={() => excluirCodigo(c.id)}
                    className="text-xs font-medium text-ink-faint hover:text-warn"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
