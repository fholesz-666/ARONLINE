import Link from "next/link";
import { FvsolPromo } from "@/components/fvsol";
import { getPublicProducts, PricingTable } from "@/components/pricing";
import { getVerificationSummary } from "@/core/risk/methodologies/csn-en-62305-2-ed2/verification";

export const dynamic = "force-dynamic";

function SampleSheet() {
  return (
    <figure className="sheet-grid relative border border-ink shadow-[6px_6px_0_0_#14213d]" aria-label="Ukázka výsledku analýzy">
      <div className="flex items-baseline justify-between gap-3 border-b border-ink bg-sheet px-4 py-2.5">
        <p className="type-wide text-sm font-semibold">Výsledky a porovnání s přípustným rizikem</p>
        <p className="text-xs text-muted">ilustrační ukázka</p>
      </div>
      <div className="p-4">
        <table className="table-tech bg-sheet">
          <thead>
            <tr>
              <th>Riziko</th>
              <th className="num">Bez opatření</th>
              <th className="num">Navržený stav</th>
              <th className="num">RT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>R1 – ztráta lidského života</td>
              <td className="num">2,46·10⁻⁵</td>
              <td className="num">3,71·10⁻⁶</td>
              <td className="num">10⁻⁵</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 border-l-4 border-ok bg-ok-soft px-3 py-2 text-sm">
          R1 ≤ RT – navržená opatření jsou dostatečná: LPS třídy III, SPD pro LPL III–IV na přípojce NN.
        </p>
        <p className="mt-3 text-xs text-muted">Dominantní složky před opatřeními: RB 61 %, RV 33 %.</p>
      </div>
      <div className="grid grid-cols-[7rem_1fr] border-t border-ink bg-sheet text-xs">
        <div className="border-r border-b border-line px-2 py-1 text-muted">Stavba</div>
        <div className="border-b border-line px-2 py-1">Rodinný dům, p. č. st. 2275/1</div>
        <div className="border-r border-b border-line px-2 py-1 text-muted">Zpracovatel</div>
        <div className="border-b border-line px-2 py-1">vaše jméno, firma a IČO</div>
        <div className="border-r border-line px-2 py-1 text-muted">Dokument</div>
        <div className="px-2 py-1 font-semibold">Analýza rizika – ochrana před bleskem</div>
      </div>
      <figcaption className="sr-only">Ilustrační hodnoty, nejde o skutečný výpočet.</figcaption>
    </figure>
  );
}

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
  return (
    <>
      <section className="border-b border-line bg-sheet">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <h1 className="text-[2.1rem] sm:text-[2.6rem]">Analýza rizika ochrany před bleskem bez přepisování podkladů</h1>
            <p className="mt-5 max-w-[60ch] text-lg text-ink-soft">
              Ověření rizika podle ČSN EN 62305-2 ed. 2 (výpočet podle ed. 3 nasadíme od 10/2027). Budovu a okolí načte z katastru, bouřkové dny z mapy ČR, výpočet vede krok za krokem a dokumentaci vydá s vaším razítkem v PDF i ve Wordu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registrace" className="btn btn-primary px-5 py-2.5">
                Založit účet zdarma
              </Link>
              <Link href="/prihlaseni" className="btn btn-secondary px-5 py-2.5">
                Jedna analýza bez registrace
              </Link>
              <Link href="/cenik" className="btn btn-secondary px-5 py-2.5">
                Prohlédnout ceník
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">Platíte až za stažení hotové dokumentace. Rozpracované analýzy se ukládají automaticky.</p>
          </div>
          <SampleSheet />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl">Jak analýza vzniká</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-5">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="border-t-2 border-ink pt-3">
              <span className="type-wide text-sm font-bold text-muted">Krok {i + 1}</span>
              <h3 className="mt-1 text-base">{title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-sheet">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-2xl">Co aplikace zjistí sama</h2>
            <ul className="mt-5 space-y-2 text-ink-soft">
              <li>Polohu, adresu, parcelu a katastrální území (RÚIAN)</li>
              <li>Obrys budovy, půdorysné rozměry a zastavěnou plochu</li>
              <li>Orientační výšku budovy z digitálního modelu povrchu</li>
              <li>Okolní budovy, vzdálenosti a návrh součinitele polohy CD</li>
              <li>Nadmořskou výšku terénu</li>
              <li>Počet bouřkových dnů Td z izokeraunické mapy ČR</li>
            </ul>
            <p className="mt-4 text-sm text-muted">Každá převzatá hodnota nese zdroj a datum. Dokud ji nepotvrdíte, je v kontrole označená.</p>
          </div>
          <div>
            <h2 className="text-2xl">Co musíte doplnit vy</h2>
            <ul className="mt-5 space-y-2 text-ink-soft">
              <li>Kontrolu počtu bouřkových dnů – předvyplní se z mapy ČR podle polohy</li>
              <li>Provedení přípojek – údaje od správce sítě nebo z projektu</li>
              <li>Požární riziko a počty osob podle PBŘ a provozu</li>
              <li>Navržená ochranná opatření: třídu LPS, SPD, stínění</li>
            </ul>
            <p className="mt-4 text-sm text-muted">Tyto údaje nelze spolehlivě získat z veřejných dat. Aplikace je nedomýšlí.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <FvsolPromo context="home" />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16" id="cenik">
        <h2 className="text-2xl">Ceník</h2>
        <p className="mt-2 max-w-[70ch] text-ink-soft">
          Analýzu založíte, vyplníte a spočítáte zdarma. Platíte za odemčení dokumentace konkrétního objektu. Ceny jsou konečné{process.env.OPERATOR_VAT_PAYER === "true" ? " včetně DPH" : ", provozovatel není plátcem DPH"}.
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
            Normové tabulky a vzorce procházejí nezávislým odborným ověřením — aktuálně ověřeno {v.verified} z {v.total} položek.
          </p>
          <Link href="/metodika" className="link mt-3 inline-block">
            Podrobnosti o metodice a ověření
          </Link>
        </div>
      </section>
    </>
  );
}
