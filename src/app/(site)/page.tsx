import Link from "next/link";
import { FvsolPromo } from "@/components/fvsol";
import { VvMark } from "@/components/vv/chrome";
import { RESULT_DISCLAIMER } from "@/config/liability";
import { OPERATOR } from "@/config/operator";
import { getPublicProducts, PricingTable } from "@/components/pricing";
import { getSettings } from "@/server/services/settings";
import { getVerificationSummary } from "@/core/risk/methodologies/csn-en-62305-2-ed2/verification";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/config/site";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

function SampleSheet() {
  return (
    <figure className="relative border-2 border-ink bg-sheet text-ink shadow-[12px_12px_0_0_#f2b705]" aria-label="Ukázka výsledku analýzy">
      <div className="flex items-baseline justify-between gap-3 border-b border-ink px-4 py-3">
        <p className="type-wide text-sm font-bold tracking-wide">VÝSLEDEK · POROVNÁNÍ S RT</p>
        <p className="font-mono text-xs text-muted">ilustrační ukázka</p>
      </div>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="border border-line p-2.5">
            <p className="text-xs text-muted">R1 bez opatření</p>
            <p className="mt-1 font-mono text-base text-bad sm:text-lg">2,46·10⁻⁵</p>
          </div>
          <div className="border border-line p-2.5">
            <p className="text-xs text-muted">Navržený stav</p>
            <p className="mt-1 font-mono text-base text-ok sm:text-lg">3,71·10⁻⁶</p>
          </div>
          <div className="border border-line p-2.5">
            <p className="text-xs text-muted">Přípustné RT</p>
            <p className="mt-1 font-mono text-base sm:text-lg">10⁻⁵</p>
          </div>
        </div>
        <div className="space-y-1.5 text-xs text-muted">
          <div className="flex justify-between">
            <span>RB – požár, výbuch</span>
            <span>61 %</span>
          </div>
          <div className="h-2 bg-line-soft">
            <div className="h-2 w-[61%] bg-ink" />
          </div>
          <div className="flex justify-between">
            <span>RV – přepětí přes vedení</span>
            <span>33 %</span>
          </div>
          <div className="h-2 bg-line-soft">
            <div className="h-2 w-[33%] bg-signal" />
          </div>
        </div>
        <p className="bg-ok-soft px-3 py-2 text-sm font-semibold text-ok">R1 ≤ RT – stačí LPS třídy III a SPD na přípojce NN.</p>
      </div>
      <div className="grid grid-cols-[7rem_1fr] border-t-2 border-ink text-xs">
        <div className="border-r border-b border-line px-2.5 py-1.5 text-muted">Stavba</div>
        <div className="border-b border-line px-2.5 py-1.5">Rodinný dům, p. č. st. 2275/1</div>
        <div className="border-r border-line px-2.5 py-1.5 text-muted">Zpracovatel</div>
        <div className="px-2.5 py-1.5 font-semibold">vaše jméno, firma, IČO a logo</div>
      </div>
      <figcaption className="sr-only">Ilustrační hodnoty, nejde o skutečný výpočet.</figcaption>
    </figure>
  );
}

const DATA_SOURCES = ["Budova z RÚIAN", "Výška z výškopisu ČÚZK", "Okolní budovy a CD", "Bouřkové dny Td z mapy ČR", "Nadmořská výška"];

const STEPS = [
  ["Razítko", "Údaje zpracovatele, logo a vzhled dokumentu vyplníte jednou. Každý další projekt je převezme."],
  ["Objekt z mapy", "Zadejte adresu nebo parcelu. Aplikace načte obrys budovy z RÚIAN, spočítá rozměry a odhadne výšku z výškopisu ČÚZK."],
  ["Okolí a vedení", "Okolní budovy a vzdálenosti uvidíte v mapě. Přípojky vyberete z předvoleb a doplníte údaje od správce sítě."],
  ["Zóny a opatření", "Formulář se přizpůsobí typu objektu. Nabízí typické hodnoty z normových tabulek, které potvrdíte nebo upravíte."],
  ["Výpočet a dokument", "Výsledek porovná rizika s přípustnou hodnotou. Dokument v PDF a editovatelném DOCX obsahuje celou stopu výpočtu."],
] as const;

export default async function HomePage() {
  const products = await getPublicProducts();
  const v = getVerificationSummary();
  const single = products.find((p) => p.code === "SINGLE");
  const { texts, operator } = await getSettings();
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "ARONLINE – analýza rizika LPS",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            inLanguage: "cs",
            url: SITE_URL,
            description:
              "Online výpočet analýzy rizika ochrany před bleskem (LPS) podle ČSN EN 62305-2 s dokumentací v PDF a DOCX.",
            offers: products.map((p) => ({
              "@type": "Offer",
              name: p.name,
              price: p.priceCzk,
              priceCurrency: "CZK",
            })),
            provider: { "@type": "Organization", name: "FVSOL – Filip Holesz", url: "https://fvsol.cz", email: OPERATOR.email },
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "FVSOL",
            url: "https://fvsol.cz",
            email: OPERATOR.projectEmail,
            founder: { "@type": "Person", name: "Filip Holesz" },
            knowsAbout: ["ochrana před bleskem", "analýza rizika LPS", "fotovoltaické elektrárny", "ČSN EN 62305"],
          },
        ]}
      />
      <section className="hero-grid text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <p className="font-mono text-xs tracking-[0.08em] text-signal sm:text-sm">ČSN EN 62305-2 ED. 2 · VÝPOČET PODLE NORMY</p>
            <h1 className="type-wide mt-4 text-[2.1rem] leading-[1.06] font-extrabold text-white sm:text-[3.2rem]">{texts.homeTitle}</h1>
            <p className="mt-5 max-w-[60ch] text-lg text-[#c9d3de]">{texts.homeLead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/prihlaseni" className="btn bg-signal px-6 py-3 text-base font-extrabold text-ink hover:bg-[#ffc824]">
                {single ? `Spočítat analýzu – ${single.priceCzk} Kč` : "Spočítat analýzu"}
              </Link>
              <Link href="/registrace" className="btn border border-[#8fa0b8] px-6 py-3 text-base text-white hover:border-white">
                Založit účet zdarma
              </Link>
            </div>
            <p className="mt-4 text-sm text-[#9fb0c6]">{texts.homeNote}</p>
          </div>
          <SampleSheet />
        </div>
      </section>

      <section className="border-b border-line bg-sheet">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-10 gap-y-3 px-4 py-6">
          <span className="font-mono text-xs tracking-[0.06em] text-muted">DATA SE NAČTOU SAMA</span>
          {DATA_SOURCES.map((d) => (
            <span key={d} className="text-[0.95rem] font-semibold">
              {d}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16 pb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="type-wide text-2xl sm:text-[2.2rem]">Pět kroků od adresy k dokumentu</h2>
          <p className="max-w-md text-ink-soft">Každá převzatá hodnota nese zdroj a datum. Dokud ji nepotvrdíte, je v kontrole označená.</p>
        </div>
        <ol className="mt-8 grid border-2 border-ink bg-sheet sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map(([title, text], i) => (
            <li
              key={title}
              className={`flex flex-col gap-2 border-line p-5 max-lg:border-b lg:border-r lg:last:border-r-0 ${i === STEPS.length - 1 ? "bg-[#fff8e1]" : ""}`}
            >
              <span className="font-mono text-sm text-[#946c00]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="type-wide text-lg">{title}</h3>
              <p className="text-[0.95rem] text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 md:grid-cols-2">
        <div className="border border-line bg-sheet p-7">
          <h2 className="type-wide text-xl">Co aplikace zjistí sama</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-soft">
            <li>Polohu, adresu, parcelu a katastrální území (RÚIAN)</li>
            <li>Obrys budovy, půdorysné rozměry a zastavěnou plochu</li>
            <li>Orientační výšku budovy z digitálního modelu povrchu</li>
            <li>Okolní budovy, vzdálenosti a návrh součinitele polohy CD</li>
            <li>Nadmořskou výšku terénu</li>
            <li>Počet bouřkových dnů Td z izokeraunické mapy ČR</li>
          </ul>
        </div>
        <div className="border border-line border-t-4 border-t-signal bg-sheet p-7">
          <h2 className="type-wide text-xl">Co doplníte vy</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-soft">
            <li>Kontrolu počtu bouřkových dnů – předvyplní se z mapy ČR podle polohy</li>
            <li>Provedení přípojek – údaje od správce sítě nebo z projektu</li>
            <li>Požární riziko a počty osob podle PBŘ a provozu</li>
            <li>Navržená ochranná opatření: třídu LPS, SPD, stínění</li>
          </ul>
          <p className="mt-4 text-sm text-muted">Tyto údaje nelze spolehlivě získat z veřejných dat. Aplikace je nedomýšlí.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="grid gap-6 border-2 border-ink bg-sheet p-7 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="font-mono text-xs tracking-[0.06em] text-muted">FVSOL · PROJEKCE ELEKTRO</p>
            <h2 className="type-wide mt-1 text-2xl">Analýza ukázala, že ochrana je potřeba? Navrhneme ji.</h2>
            <ul className="mt-4 grid gap-1.5 text-ink-soft sm:grid-cols-2">
              <li>Návrh hromosvodu (LPS) a uzemnění</li>
              <li>Přepěťové ochrany a vyrovnání potenciálů</li>
              <li>Projekty FVE – DSP, DPS, realizační</li>
              <li>Technické zprávy, výkresy, výpočty</li>
              <li>Analýza rizika zpracovaná projektantem</li>
              <li>Audit a kontrola dokumentace</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <a className="btn btn-primary px-5 py-3" href="https://fvsol.cz/?utm_source=aronline&utm_medium=web&utm_campaign=sluzby" rel="noopener">
              Nezávazná poptávka na fvsol.cz
            </a>
            <a className="link text-sm" href={`mailto:${OPERATOR.projectEmail}`}>
              {OPERATOR.projectEmail}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/vnejsi-vlivy" className="flex flex-col gap-4 bg-[#0b3b36] p-6 text-white no-underline hover:bg-[#0d4741] sm:flex-row sm:items-center">
          <VvMark className="h-14 w-14 shrink-0" />
          <span className="flex-1">
            <span className="block text-xs font-bold tracking-[0.08em] text-[#5eead4]">NOVINKA · ZDARMA</span>
            <span className="mt-1 block text-xl font-bold">Protokol o určení vnějších vlivů online</span>
            <span className="mt-1 block text-sm text-[#b9e3dc]">
              Komise vyklikne prostory podle ČSN 33 2000-5-51 ed. 3, aplikace vyhodnotí vlivy, doplní opatření a krytí IP. PDF ihned.
            </span>
          </span>
          <span className="btn shrink-0 bg-[#fde68a] px-5 py-2.5 font-extrabold text-[#0b2a27]">Vyplnit protokol →</span>
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16" id="cenik">
        <h2 className="type-wide text-2xl sm:text-[2.2rem]">Ceník</h2>
        <p className="mt-2 max-w-[70ch] text-ink-soft">
          {texts.pricingIntro} Ceny jsou konečné{operator.vatPayer ? " včetně DPH" : ", provozovatel není plátcem DPH"}. Platit můžete kartou online nebo bankovním převodem.
        </p>
        <div className="mt-8">
          <PricingTable products={products} />
        </div>
        <p className="mt-4 text-sm">
          <Link href="/cenik" className="link">
            Podmínky tarifů a plateb
          </Link>
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="border border-line bg-sheet p-6">
          <h2 className="text-xl">Stav ověření výpočtu</h2>
          <p className="mt-2 max-w-[75ch] text-ink-soft">
            Výpočet je dohledatelný: každý dokument obsahuje vzorce, dosazené hodnoty, odkazy na články normy, verzi výpočetního jádra a otisk vstupních dat.
            Normové tabulky a vzorce byly porovnány s textem ČSN EN 62305-2 ed. 2 včetně změny Z1 — ověřeno {v.verified} z {v.total} položek.
          </p>
          <p className="mt-3 max-w-[75ch] text-sm text-ink-soft">{RESULT_DISCLAIMER}</p>
          <Link href="/metodika" className="link mt-3 inline-block">
            Podrobnosti o metodice a ověření
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-10">
        <FvsolPromo variant="results" context="home-konec" />
      </section>
    </>
  );
}
