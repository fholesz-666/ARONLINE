/**
 * Decentní odkaz na služby FVSOL (projekce FVE a LPS).
 * Varianty: "card" (samostatný blok), "inline" (jeden řádek), "results" (po výsledku analýzy).
 */
const URL = "https://fvsol.cz";

export function FvsolPromo({ variant = "card", context }: { variant?: "card" | "inline" | "results"; context?: string }) {
  const href = `${URL}/?utm_source=aronline&utm_medium=app&utm_campaign=${encodeURIComponent(context ?? variant)}`;
  if (variant === "inline") {
    return (
      <p className="text-sm text-ink-soft">
        Potřebujete projekt hromosvodu nebo FVE?{" "}
        <a className="link" href={href} target="_blank" rel="noopener">
          Zpracujeme ho – fvsol.cz
        </a>
      </p>
    );
  }
  const title =
    variant === "results" ? "Výsledek vyžaduje ochranu před bleskem? Navrhneme ji." : "Projektová dokumentace FVE a ochrany před bleskem";
  const text =
    variant === "results"
      ? "Analýza rizika určí, jaká ochrana je potřeba. Návrh hromosvodu (LPS), přepěťových ochran, technickou zprávu a výkresy pro stavební řízení i realizaci vám připravíme na klíč."
      : "Kompletní dokumentace fotovoltaických elektráren a hromosvodů – od studie přes DSP a DPS až po realizační výkresy, včetně analýzy rizika, návrhu LPS a přepěťových ochran.";
  return (
    <aside className="flex flex-col gap-3 rounded-md border border-line bg-sheet p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Související služby · FVSOL</p>
        <h3 className="mt-1 text-base">{title}</h3>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-soft">{text}</p>
      </div>
      <a className="btn btn-secondary shrink-0" href={href} target="_blank" rel="noopener">
        Poptat na fvsol.cz
      </a>
    </aside>
  );
}
