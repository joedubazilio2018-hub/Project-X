"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";

const MSG_ERRO_PADRAO = "Não deu pra salvar agora. Tenta de novo em instantes.";

export default function PerfilPage() {
  const supabase = createClient();
  const { mostrarToast } = useToast();
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        mostrarToast(MSG_ERRO_PADRAO);
        setLoading(false);
        return;
      }
      const meta = data.user?.user_metadata;
      setNome((meta?.nome as string) ?? "");
      setIdade(meta?.idade ? String(meta.idade) : "");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setSucesso(false);

    const { error } = await supabase.auth.updateUser({
      data: {
        nome: nome.trim(),
        idade: idade ? parseInt(idade, 10) : null,
      },
    });

    setSalvando(false);

    if (error) {
      mostrarToast(MSG_ERRO_PADRAO);
      return;
    }

    setSucesso(true);
  }

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Perfil</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Atualize suas informações pessoais.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : (
        <form
          onSubmit={salvar}
          className="flex max-w-sm flex-col gap-4 rounded-xl border border-base-border bg-base-surface p-5"
        >
          <div>
            <label className="mb-1.5 block text-sm text-ink-muted">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-ink-muted">Idade</label>
            <input
              type="number"
              min={1}
              max={120}
              value={idade}
              onChange={(e) => setIdade(e.target.value)}
              className="w-full rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="Sua idade"
            />
          </div>

          {sucesso && (
            <p className="rounded-lg bg-accent-dim px-3 py-2 text-sm text-accent">
              Perfil atualizado com sucesso.
            </p>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}
    </AppShell>
  );
}
