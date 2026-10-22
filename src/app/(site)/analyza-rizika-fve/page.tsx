import type { Metadata } from "next";
import Link from "next/link";
import { FvsolPromo } from "@/components/fvsol";

export const metadata: Metadata = {
  title: "Analýza rizika pro FVE na střeše – hromosvod a přepěťové ochrany",
  description:
    "Fotovoltaika na střeše a ochrana před bleskem: proč se analýza rizika podle ČSN EN 62305-2 přepočítává po instalaci FVE, jak zadat DC vedení a kdy je potřeba hromosvod nebo SPD.",
  alternates: { canonical: "/analyza-rizika-fve" },
};

export default function FveRiskPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">Fotovoltaika</p>
      <h1 className="mt-1 text-3xl">Analýza rizika ochrany před bleskem u fotovoltaické elektrárny</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Fotovoltaická elektrárna na střeše přidává do budovy nová vedení a citlivou elektroniku – střídač, baterii, monitoring. Proto je součástí projektu FVE obvykle i
        posouzení ochrany před bleskem a přepětím.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/prihlaseni" className="btn btn-primary">
          Spočítat analýzu pro FVE
        </Link>
        <a className="btn btn-secondary" href="https://fvsol.cz/?utm_source=aronline&utm_medium=web&utm_campaign=fve-landing" rel="noopener">
          Projekt FVE na klíč – fvsol.cz
        </a>
      </div>

      <h2 className="mt-12 text-2xl">Co se po instalaci FVE v analýze mění</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
        <li>
          <strong>Nové vedení.</strong> Rozvody FVE vedené po střeše nebo fasádě se zadávají jako další vedení – zpravidla nestíněné venkovní, s vlastní délkou a SPD na vstupu.
        </li>
        <li>
          <strong>Nové vnitřní systémy.</strong> Střídač a baterie mají vlastní impulzní výdržné napětí UW a vlastní kabeláž – vstupují do složek RC, RM, RW a RZ.
        </li>
        <li>
          <strong>Ekonomická ztráta.</strong> Hodnota technologie zvyšuje význam R4 – při rozhodování o ochraně se vyplatí ji vyčíslit.
        </li>
        <li>
          <strong>Stávající hromosvod.</strong> Panely je nutné umístit v ochranném prostoru jímací soustavy a dodržet dostatečnou vzdálenost; to už je předmětem projektu LPS.
        </li>
      </ul>

      <h2 className="mt-12 text-2xl">Typický postup</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-soft">
        <li>Spočítat analýzu pro stávající stav budovy (s vedením NN, telekomunikacemi).</li>
        <li>Doplnit vedení FVE, střídač a baterii a zjistit, které složky rizika vzrostly.</li>
        <li>Navrhnout opatření – třídu LPS, SPD typu 1/2 na vstupu vedení, koordinované SPD u střídače – a výpočet zopakovat.</li>
        <li>Výsledek přiložit k projektu FVE (DSP/DPS) a k projektu ochrany před bleskem.</li>
      </ol>
      <p className="mt-4 text-ink-soft">
        V ARONLINE jsou připravené předvolby pro vedení FVE i střídač, takže změnu stavu zadáte za pár minut. Výpočet je vždy jen podklad – návrh LPS a SPD dělá projektant.
      </p>

      <div className="mt-12">
        <FvsolPromo context="analyza-rizika-fve" />
      </div>
      <p className="mt-8 text-sm">
        Další informace: <Link href="/analyza-rizika-lps" className="link">Analýza rizika LPS podle ČSN EN 62305-2</Link> ·{" "}
        <Link href="/casto-kladene-otazky" className="link">Časté otázky</Link>
      </p>
    </article>
  );
}
