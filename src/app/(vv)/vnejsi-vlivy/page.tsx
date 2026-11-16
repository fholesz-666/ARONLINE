import type { Metadata } from "next";
import Link from "next/link";
import { VvPromoStrip } from "@/components/vv/chrome";
import { VV_PRODUCT_CODE } from "@/config/pricing";
import { SITE_URL } from "@/config/site";
import { VV_PRESETS } from "@/core/vv/presets";
import { getProduct } from "@/server/services/billing";

export const metadata: Metadata = {
  title: { absolute: "Protokol o určení vnějších vlivů online zdarma | VV online" },
  description:
    "Vyplňte protokol o určení vnějších vlivů podle ČSN 33 2000-5-51 ed. 3 online a zdarma. Komise, prostory, předvolby typických místností, vyhodnocení a doporučená opatření. PDF ihned.",
  alternates: { canonical: `${SITE_URL}/vnejsi-vlivy` },
  openGraph: {
    title: "Protokol o určení vnějších vlivů online zdarma",
    description: "Formulář pro komisi podle ČSN 33 2000-5-51 ed. 3 – PDF ihned a zdarma.",
    url: `${SITE_URL}/vnejsi-vlivy`,
  },
};

export const dynamic = "force-dynamic";

async function premiumPrice(): Promise<number> {
  try {
    const p = await getProduct(VV_PRODUCT_CODE);
    if (p?.active) return p.priceHaler / 100;
  } catch {
    /* výchozí cena */
  }
  return 99;
}

const STEPS: [string, string][] = [
  ["Objekt", "Stavba, adresa, objednatel a evidenční číslo."],
  ["Komise", "Předseda a členové s profesí. Každý na konci potvrdí."],
  ["Prostory", "Typ prostoru předvyplní vlivy, vy je upravíte podle skutečnosti."],
  ["PDF ihned", "Vyhodnocení, opatření, krytí IP a podpisové řádky."],
];

/** Ukázkové řádky vyhodnocení (střecha s FVE). */
const SAMPLE: [string, string, boolean][] = [
  ["Teplota okolí", "AA7", true],
  ["Výskyt vody", "AD4", true],
  ["Cizí pevná tělesa", "AE4", true],
  ["Bouřková činnost", "AQ3", true],
  ["Schopnost osob", "BA1", false],
  ["Stavební materiály", "CA1", false],
];

/** Předvolby pro FVE – zvýrazněné. */
const HIGHLIGHT = new Set(["pv-roof", "pv-tech"]);

const FAQ: [string, string][] = [
  [
    "Kdo vnější vlivy určuje?",
    "Komise složená z odborníků (projektant, revizní technik, zástupce investora nebo provozovatele, technolog). VV online je formulář – za určení odpovídá komise, každý její člen to na konci potvrdí.",
  ],
  [
    "Podle jaké normy?",
    "Kódy, meze a příznak normálního vlivu vycházejí z ČSN 33 2000-5-51 ed. 3 + Z1 + Z2, příloha ZA (tabulka ZA.1), včetně národních poznámek pro AD1, AE1 a BC2.",
  ],
  [
    "Co znamená abnormální prostor?",
    "Alespoň jeden posuzovaný vliv není považován za normální. U každého takového vlivu protokol uvede doporučené opatření a souhrnně minimální krytí IP.",
  ],
  [
    "Jak se k protokolu vrátím?",
    "Po vytvoření dostanete na e-mail odkaz. Přes něj protokol znovu stáhnete nebo upravíte. Profi protokoly najdete i po přihlášení v Moje protokoly.",
  ],
];

export default async function VvLandingPage() {
  const price = await premiumPrice();
  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-4 pt-12 pb-16 lg:gap-14 lg:pt-16">
        <div className="min-w-0 flex-[1_1_440px]">
          <p className="flex flex-wrap gap-2">
            <span className="vv-chip vv-chip-accent px-3 py-1 text-[0.8rem]">Zdarma</span>
            <span className="vv-chip vv-chip-accent px-3 py-1 text-[0.8rem]">Bez registrace</span>
            <span className="vv-chip vv-chip-accent px-3 py-1 text-[0.8rem]">ČSN 33 2000-5-51 ed. 3</span>
          </p>
          <h1 className="mt-5 text-[2.2rem] leading-[1.06] font-extrabold tracking-[-0.02em] text-[#0b3b36] sm:text-[3.4rem]">
            Protokol o vnějších vlivech za pět minut. Komise jen kliká.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            Vyberete typ prostoru, hodnoty se předvyplní podle normy. Aplikace vyhodnotí, které vlivy nejsou normální, doplní opatření a minimální krytí IP.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/vnejsi-vlivy/novy" className="vv-btn vv-btn-primary px-7 py-3.5 text-base font-extrabold">
              Vyplnit protokol zdarma
            </Link>
            <Link href="#jak-to-funguje" className="vv-btn vv-btn-secondary px-6 py-3.5 text-base">
              Jak to funguje
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">Profi verze bez vodoznaku, s vaším logem a ve Wordu za {price} Kč.</p>
        </div>

        <figure className="relative m-0 min-w-0 flex-[1_1_400px] pb-6 pl-6">
          <div className="absolute bottom-0 left-0 h-[88%] w-[86%] rounded-[20px] bg-[#0f766e]" aria-hidden="true" />
          <div className="relative flex flex-col gap-3.5 rounded-[14px] bg-white p-6 shadow-[0_24px_60px_rgba(11,59,54,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.7rem] font-extrabold tracking-[0.1em] text-[#0f766e]">PROTOKOL O URČENÍ VNĚJŠÍCH VLIVŮ</p>
                <p className="mt-1 text-lg font-extrabold">2) Střecha s fotovoltaickými panely</p>
              </div>
              <span className="text-xs whitespace-nowrap text-muted">PVV 2026-014</span>
            </div>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {SAMPLE.map(([name, code, bad]) => (
                  <tr key={code} className={bad ? "vv-row-abnormal" : undefined}>
                    <td className="border-b border-[var(--vv-line)] px-2 py-1.5">{name}</td>
                    <td className="border-b border-[var(--vv-line)] px-2 py-1.5 text-right font-extrabold">{code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-bold">Závěr:</span>
              <span className="rounded-md bg-bad px-2.5 py-1 text-xs font-extrabold text-white">ABNORMÁLNÍ</span>
              <span className="rounded-md bg-[#fde68a] px-2.5 py-1 text-xs font-extrabold text-[#0b2a27]">min. krytí IP54</span>
            </div>
            <p className="border-t border-dashed border-[var(--vv-line)] pt-3 text-[0.8rem] text-ink-soft">
              AQ3 – ochrana před bleskem podle ČSN EN 62305 včetně analýzy rizika.
            </p>
            <div className="grid grid-cols-3 gap-2.5 pt-1 text-[0.7rem] text-muted">
              <span className="border-t border-ink pt-1">předseda ✓</span>
              <span className="border-t border-ink pt-1">člen ✓</span>
              <span className="border-t border-ink pt-1">člen ✓</span>
            </div>
          </div>
          <figcaption className="relative mt-2.5 text-xs text-muted">Ukázka vyhodnocení jednoho prostoru</figcaption>
        </figure>
      </section>

      <section id="jak-to-funguje" className="scroll-mt-4 border-y border-[var(--vv-line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-[1.9rem] font-extrabold tracking-[-0.01em] text-[#0b3b36] sm:text-[2.4rem]">Čtyři kroky. Žádný Word.</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([t, d], i) => {
              const last = i === STEPS.length - 1;
              return (
                <li key={t} className={`flex flex-col gap-2.5 rounded-2xl p-6 ${last ? "bg-[#0b3b36] text-white" : "bg-[var(--vv-bg)]"}`}>
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-extrabold ${last ? "bg-[#fde68a] text-[#0b2a27]" : "bg-[#0f766e] text-white"}`}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold">{t}</h3>
                  <p className={`text-[0.95rem] ${last ? "text-[#b9e3dc]" : "text-ink-soft"}`}>{d}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-wrap items-start gap-10 px-4 py-16">
        <div className="min-w-0 flex-[1_1_320px]">
          <h2 className="text-[1.8rem] font-extrabold text-[#0b3b36] sm:text-[2.1rem]">{VV_PRESETS.length} předvoleb prostor</h2>
          <p className="mt-3 text-lg text-ink-soft">
            Kódy, meze a „normální“ hodnoty podle tabulky ZA.1 ČSN 33 2000-5-51 ed. 3 včetně českých poznámek k AD1, AE1 a BC2.
          </p>
          <Link href="/vnejsi-vlivy/novy" className="vv-link mt-4 inline-block font-semibold">
            Vyzkoušet ve formuláři →
          </Link>
        </div>
        <ul className="flex min-w-0 flex-[2_1_520px] flex-wrap gap-2.5">
          {VV_PRESETS.map((p) => (
            <li
              key={p.id}
              className={`rounded-full px-4 py-2.5 text-[0.95rem] font-semibold ${
                HIGHLIGHT.has(p.id) ? "bg-[#0f766e] text-white" : "border border-[var(--vv-line)] bg-white"
              }`}
            >
              {p.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-[1.9rem] font-extrabold text-[#0b3b36] sm:text-[2.4rem]">Zdarma, nebo Profi</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3.5 rounded-[20px] border border-[var(--vv-line)] bg-white p-8">
            <p className="text-xl font-bold">Zdarma</p>
            <p className="text-[2.6rem] leading-none font-extrabold">0 Kč</p>
            <ul className="list-disc space-y-2 pl-5 text-ink-soft">
              <li>Neomezeně prostor a členů komise</li>
              <li>Vyhodnocení, doporučená opatření a krytí IP</li>
              <li>PDF ihned a odkaz pro pozdější úpravy</li>
              <li>Jemný vodoznak a patička, PDF zamčené proti úpravám</li>
            </ul>
            <Link href="/vnejsi-vlivy/novy" className="vv-btn vv-btn-secondary mt-auto py-3.5">
              Vyplnit zdarma
            </Link>
          </div>
          <div className="flex flex-col gap-3.5 rounded-[20px] bg-[#0b3b36] p-8 text-white">
            <p className="text-xl font-bold text-[#5eead4]">Profi</p>
            <p className="text-[2.6rem] leading-none font-extrabold">{price} Kč</p>
            <ul className="list-disc space-y-2 pl-5 text-[#d4efea]">
              <li>Bez vodoznaku, reklamní patičky a zámku</li>
              <li>Vaše logo v záhlaví protokolu</li>
              <li>Editovatelný Word (DOCX)</li>
              <li>Uložení do účtu (Moje protokoly)</li>
            </ul>
            <Link href="/vnejsi-vlivy/novy" className="vv-btn mt-auto bg-[#fde68a] py-3.5 font-extrabold text-[#0b2a27] hover:bg-[#fcd34d]">
              Vyplnit a odemknout Profi
            </Link>
            <p className="text-xs text-[#b9e3dc]">Profi se kupuje k hotovému protokolu – kartou, nebo kreditem z účtu.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-[1.9rem] font-extrabold text-[#0b3b36] sm:text-[2.4rem]">Časté otázky</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <div key={q} className="rounded-2xl border border-[var(--vv-line)] bg-white p-6">
              <h3 className="text-base font-bold">{q}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--vv-line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-xl font-extrabold text-[#0b3b36]">Co dál po protokolu</h2>
          <div className="mt-5">
            <VvPromoStrip campaign="landing-dole" />
          </div>
        </div>
      </section>
    </>
  );
}
