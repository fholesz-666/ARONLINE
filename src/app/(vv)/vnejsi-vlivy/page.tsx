import type { Metadata } from "next";
import Link from "next/link";
import { VvPromoStrip } from "@/components/vv/chrome";
import { VV_PRODUCT_CODE } from "@/config/pricing";
import { SITE_URL } from "@/config/site";
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
  ["Objekt", "Název stavby, adresa, objednatel a evidenční číslo protokolu."],
  ["Komise", "Předseda a členové komise s profesí. Každý člen na konci potvrdí určení vlivů."],
  ["Prostory", "Vyberte typ prostoru (koupelna, kotelna, střecha s FVE…) a hodnoty upravte podle skutečnosti."],
  ["Protokol", "Aplikace vyhodnotí, které vlivy nejsou normální, doplní opatření a krytí IP. PDF stáhnete hned."],
];

export default async function VvLandingPage() {
  const price = await premiumPrice();
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-10 pt-12 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <span className="vv-chip vv-chip-accent">Zdarma · bez registrace · podle ČSN 33 2000-5-51 ed. 3</span>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-ink sm:text-4xl">Protokol o určení vnějších vlivů online</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            Komise vyklikne prostory, aplikace vyhodnotí normální a abnormální vlivy, doplní doporučená opatření a minimální krytí. Hotový
            protokol v PDF máte za pár minut.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/vnejsi-vlivy/novy" className="vv-btn vv-btn-primary px-6 py-3 text-base">
              Vyplnit protokol zdarma
            </Link>
            <Link href="#jak-to-funguje" className="vv-btn vv-btn-secondary px-6 py-3 text-base">
              Jak to funguje
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted">Bez vodoznaku, s vaším logem a ve Wordu za {price} Kč.</p>
        </div>
        <div className="vv-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ukázka vyhodnocení</p>
          <p className="mt-2 font-semibold">2) Střecha s fotovoltaickými panely</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {[
                ["Teplota okolí", "AA7", true],
                ["Výskyt vody", "AD4", true],
                ["Výskyt cizích pevných těles", "AE4", true],
                ["Bouřková činnost", "AQ3", true],
                ["Schopnost osob", "BA1", false],
              ].map(([n, c, bad]) => (
                <tr key={String(c)} className={bad ? "vv-row-abnormal" : undefined}>
                  <td className="border-b border-[var(--vv-line)] px-2 py-1.5">{n}</td>
                  <td className="border-b border-[var(--vv-line)] px-2 py-1.5 font-semibold">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm">
            Závěr: <span className="vv-chip vv-chip-bad">ABNORMÁLNÍ</span> · minimální krytí <strong>IP54</strong>
          </p>
          <p className="mt-2 text-xs text-muted">AQ3 – ochrana před bleskem podle ČSN EN 62305 včetně analýzy rizika.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <VvPromoStrip campaign="landing" />
      </section>

      <section id="jak-to-funguje" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Jak to funguje</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="vv-card p-5">
              <span className="vv-step-num border-[var(--vv-accent)] text-[var(--vv-accent-strong)]">{i + 1}</span>
              <p className="mt-3 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Zdarma, nebo Profi</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="vv-card p-6">
            <p className="text-lg font-semibold">Zdarma</p>
            <p className="mt-1 text-3xl font-bold">0 Kč</p>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
              <li>✓ Neomezený počet prostor a členů komise</li>
              <li>✓ Vyhodnocení, doporučená opatření a krytí IP</li>
              <li>✓ PDF ke stažení a odkaz pro pozdější úpravy</li>
              <li>· Jemný vodoznak, patička s odkazem na ARONLINE a FVSOL, PDF zamčené proti úpravám</li>
            </ul>
          </div>
          <div className="vv-card border-[var(--vv-accent)] p-6">
            <p className="text-lg font-semibold text-[var(--vv-accent-strong)]">Profi</p>
            <p className="mt-1 text-3xl font-bold">{price} Kč</p>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
              <li>✓ Vše ze zdarma verze</li>
              <li>✓ Bez vodoznaku a reklamní patičky, PDF bez zámku</li>
              <li>✓ Vaše logo v záhlaví protokolu</li>
              <li>✓ Editovatelný Word (DOCX)</li>
            </ul>
            <p className="mt-3 text-xs text-muted">Placená verze se kupuje k hotovému protokolu, platba kartou přes GoPay.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Časté otázky</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
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
              "Po vytvoření dostanete na e-mail odkaz. Přes něj protokol znovu stáhnete nebo upravíte. Odkaz nikomu nepřeposílejte – funguje jako heslo.",
            ],
          ].map(([q, a]) => (
            <div key={q} className="vv-card p-5">
              <p className="font-semibold">{q}</p>
              <p className="mt-1 text-sm text-ink-soft">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Co dál po protokolu</h2>
        <div className="mt-6">
          <VvPromoStrip campaign="landing-dole" />
        </div>
      </section>
    </>
  );
}
