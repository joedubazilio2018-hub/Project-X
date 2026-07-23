import { frasedoDia } from "@/lib/frase-do-dia";
import CompartilharFrase from "@/components/CompartilharFrase";

export default function QuoteCard() {
  const { frase, explicacao } = frasedoDia();

  return (
    <section className="mb-5 rounded-2xl border border-base-border bg-base-surface p-5">
      <p className="font-display text-lg font-bold italic leading-snug text-ink">
        &ldquo;{frase}&rdquo;
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{explicacao}</p>
      <CompartilharFrase frase={frase} explicacao={explicacao} />
    </section>
  );
}
