import type { Identification, ProcessorData } from "@/domain/project";

/** Náhled razítka (title block) tak, jak bude v dokumentu. */
export function StampPreview({
  processor,
  identification,
  logoUrl,
}: {
  processor: Partial<ProcessorData>;
  identification?: Partial<Identification>;
  logoUrl?: string | null;
}) {
  const id = identification;
  const rows: [string, string][] = [
    ["Zpracovatel", [processor.fullName, processor.authorization].filter(Boolean).join(", ")],
    ["Firma", [processor.company, processor.ico ? `IČO ${processor.ico}` : ""].filter(Boolean).join(", ")],
    ["Kontakt", [processor.email, processor.phone].filter(Boolean).join(", ")],
    ["Investor", id?.investor?.name ?? ""],
    ["Stavba", id?.building?.name || id?.projectName || ""],
    ["Místo stavby", id?.building?.address ?? ""],
    ["Stupeň", id?.docStage ?? ""],
    ["Číslo zakázky", id?.jobNumber ?? ""],
    ["Datum", id?.date ? new Date(id.date).toLocaleDateString("cs-CZ") : ""],
    ["Revize", id?.revision ?? ""],
    ["Dokument", "Analýza rizika – ochrana před bleskem"],
  ];
  const accent = processor.appearance?.accentColor ?? "#1f4e79";
  return (
    <figure className="border-2 border-ink bg-sheet text-[0.78rem]" aria-label="Náhled razítka">
      {logoUrl && (
        <div className="flex h-14 items-center border-b-2 border-ink px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Logo zpracovatele" className="max-h-11 max-w-[10rem] object-contain" />
        </div>
      )}
      <dl className="grid grid-cols-[6.5rem_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="border-b border-r border-line px-2 py-1 text-muted">{k}</dt>
            <dd className={`border-b border-line px-2 py-1 ${k === "Dokument" ? "font-semibold" : ""}`} style={k === "Dokument" ? { color: accent } : undefined}>
              {v || <span className="text-line">—</span>}
            </dd>
          </div>
        ))}
      </dl>
      {processor.stampNote && <figcaption className="px-2 py-1 text-muted">{processor.stampNote}</figcaption>}
    </figure>
  );
}
