import AppShell from "@/components/AppShell";

export default function FinancasPage() {
  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Finanças</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Esta seção chega na última parte do projeto, com gráficos.
        </p>
      </header>
      <div className="rounded-xl border border-dashed border-base-border p-8 text-center">
        <p className="text-sm text-ink-muted">Em construção.</p>
      </div>
    </AppShell>
  );
}
