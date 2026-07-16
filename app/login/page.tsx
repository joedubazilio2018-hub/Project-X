"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigoConvite, setCodigoConvite] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quando true, mostra a tela "verifique seu e-mail" em vez do formulário
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [emailCadastrado, setEmailCadastrado] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(traduzErro(error.message));
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      // Código de convite agora é OPCIONAL. Se a pessoa preencheu, a
      // gente confere antes de criar a conta (dá um erro amigável na
      // hora, em vez de deixar o banco rejeitar depois). Se deixou em
      // branco, segue direto pro cadastro normal — a conta nasce em
      // trial de 7 dias (isso é decidido no banco, não aqui).
      const codigoLimpo = codigoConvite.trim();

      if (codigoLimpo) {
        const { data: codigoValido, error: erroValidacao } = await supabase.rpc(
          "validar_codigo_convite",
          { p_code: codigoLimpo }
        );

        if (erroValidacao || !codigoValido) {
          setError("Código de convite inválido, expirado ou já utilizado.");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome.trim(),
            ...(codigoLimpo ? { invite_code: codigoLimpo } : {}),
          },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/login`
              : undefined,
        },
      });
      if (error) {
        setError(traduzErro(error.message));
        setLoading(false);
      } else {
        setEmailCadastrado(email);
        setAguardandoConfirmacao(true);
        setLoading(false);
      }
    }
  }

  // ───────────────────────────────────────────
  // Tela exibida após o cadastro, antes da confirmação
  // ───────────────────────────────────────────
  if (aguardandoConfirmacao) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-5 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-dim">
              <span className="text-2xl">✉️</span>
            </div>
          </div>
          <h1 className="font-display text-xl font-bold text-ink">
            Confirme seu e-mail
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Enviamos um link de confirmação para
          </p>
          <p className="mt-1 text-sm font-semibold text-accent">
            {emailCadastrado}
          </p>
          <p className="mt-4 text-sm text-ink-muted">
            Clique no link recebido para ativar sua conta. Se não encontrar,
            confira a caixa de spam.
          </p>

          <button
            onClick={() => {
              setAguardandoConfirmacao(false);
              setMode("signin");
            }}
            className="mt-6 text-sm font-medium text-ink-muted underline hover:text-ink"
          >
            Voltar para o login
          </button>
        </div>
      </main>
    );
  }

  // ───────────────────────────────────────────
  // Tela de login / cadastro
  // ───────────────────────────────────────────
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mark.png"
            alt="Ascese"
            className="mx-auto mb-4 h-20 w-20 rounded-full border border-base-border object-cover"
          />
          <h1 className="font-display text-2xl font-bold text-ink">
            Ascese
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
            by JB Group
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            Hábitos, metas e rotina. Sem desculpas.
          </p>
        </div>

        <div className="rounded-xl border border-base-border bg-base-surface p-6">
          <div className="mb-5 flex gap-1 rounded-lg bg-base p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "signin"
                  ? "bg-base-surface text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-base-surface text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="nome" className="mb-1.5 block text-sm text-ink-muted">
                  Nome
                </label>
                <input
                  id="nome"
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm text-ink-muted">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="voce@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm text-ink-muted">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="••••••••"
              />
            </div>

            {mode === "signup" && (
              <div className="rounded-lg bg-accent-dim px-3 py-2 text-xs text-accent">
                7 dias grátis pra testar tudo.
              </div>
            )}

            {mode === "signup" && (
              <div>
                <label htmlFor="codigo" className="mb-1.5 block text-sm text-ink-muted">
                  Código de convite <span className="text-ink-faint">(opcional)</span>
                </label>
                <input
                  id="codigo"
                  type="text"
                  value={codigoConvite}
                  onChange={(e) => setCodigoConvite(e.target.value)}
                  className="w-full rounded-lg border border-base-border bg-base px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="Só se alguém te enviou um"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-warn-dim px-3 py-2 text-sm text-warn">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function traduzErro(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (msg.includes("User already registered")) return "Já existe uma conta com este e-mail.";
  if (msg.includes("Password should be")) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
}
