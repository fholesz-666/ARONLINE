import type { Metadata } from "next";
import Link from "next/link";
import { FvsolPromo } from "@/components/fvsol";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/config/site";

export const metadata: Metadata = {
  title: "Analýza rizika LPS podle ČSN EN 62305-2 – online výpočet",
  description:
    "Co je analýza rizika ochrany před bleskem (LPS), kdy ji potřebujete, z čeho se počítá a jak ji zpracovat online podle ČSN EN 62305-2 za 149 Kč – s dokumentací v PDF i DOCX.",
  alternates: { canonical: "/analyza-rizika-lps" },
};

const STEPS = [
  ["Stavba", "Rozměry L × W × H, poloha vůči okolí (součinitel CD), druh a využití objektu."],
  ["Bouřková činnost", "Počet bouřkových dnů Td z izokeraunické mapy ČR nebo hustota úderů NG."],
  ["Vedení", "Přípojky NN, VN, datové a telekomunikační linky – délka, uložení, stínění, SPD na vstupu."],
  ["Zóny a ztráty", "Počty osob, požární riziko, protipožární opatření, podlahy, zvláštní nebezpečí, vnitřní systémy."],
  ["Výsledek", "Rizika R1–R4 porovnaná s přípustnými hodnotami RT a návrh, která opatření riziko sníží."],
] as const;

export default function LpsRiskPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Analýza rizika LPS podle ČSN EN 62305-2",
          inLanguage: "cs",
          url: `${SITE_URL}/analyza-rizika-lps`,
          author: { "@type": "Person", name: "Filip Holesz" },
          publisher: { "@type": "Organization", name: "FVSOL", url: "https://fvsol.cz" },
        }}
      />
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">Průvodce</p>
      <h1 className="mt-1 text-3xl">Analýza rizika LPS (ochrany před bleskem) podle ČSN EN 62305-2</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Analýza rizika – v normě „řízení rizika“ – určuje, zda stavba potřebuje ochranu před bleskem (LPS, hromosvod) a přepěťové ochrany, a pokud ano, v jakém rozsahu.
        Výsledkem je dokument, který projektant přikládá k projektové dokumentaci stavby nebo k projektu hromosvodu či fotovoltaické elektrárny.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/prihlaseni" className="btn btn-primary">
          Spočítat analýzu online
        </Link>
        <Link href="/cenik" className="btn btn-secondary">
          Ceník – od 149 Kč
        </Link>
      </div>

      <h2 className="mt-12 text-2xl">Kdy se analýza rizika zpracovává</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
        <li>u novostaveb a změn staveb, kde je třeba prokázat, zda je ochrana před bleskem potřebná (vyhláška č. 146/2024 Sb., o požadavcích na výstavbu, § 26),</li>
        <li>při návrhu nebo rekonstrukci hromosvodu – analýza určuje třídu LPS (I–IV) a hladinu ochrany SPD,</li>
        <li>při instalaci fotovoltaické elektrárny na střechu – FVE mění riziko i vedení vstupující do budovy,</li>
        <li>u škol, nemocnic, obchodů, průmyslových a zemědělských objektů, kde jde o životy osob nebo velké škody.</li>
      </ul>
      <p className="mt-3 text-sm text-muted">
        Konkrétní povinnost pro danou stavbu posuzuje projektant podle platných předpisů. Shrnutí není právní výklad.
      </p>

      <h2 className="mt-12 text-2xl">Co se v analýze počítá</h2>
      <p className="mt-3 text-ink-soft">
        Norma rozlišuje čtyři druhy ztrát: <strong>R1</strong> ztráta lidského života, <strong>R2</strong> ztráta veřejné služby, <strong>R3</strong> ztráta kulturního dědictví a{" "}
        <strong>R4</strong> ekonomická ztráta. Každé riziko je součtem složek RA až RZ podle příčiny (úder do stavby, do její blízkosti, do vedení a do blízkosti vedení) a
        druhu škody (úraz, požár, porucha elektroniky). Riziko R1 až R3 se porovná s přípustnou hodnotou RT; je-li vyšší, navrhnou se opatření – LPS, SPD, stínění, protipožární
        opatření – a výpočet se zopakuje.
      </p>

      <h2 className="mt-12 text-2xl">Jaké údaje budete potřebovat</h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="panel p-4">
            <span className="text-sm font-bold text-muted">{i + 1}.</span> <strong>{t}</strong>
            <p className="mt-1 text-sm text-ink-soft">{d}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-ink-soft">
        ARONLINE většinu údajů předvyplní: budovu a okolí načte z katastru (RÚIAN, ČÚZK), bouřkové dny z mapy ČR podle polohy a typické hodnoty ztrát podle druhu objektu.
        Vy je jen zkontrolujete a doplníte, co z veřejných dat zjistit nejde.
      </p>

      <h2 className="mt-12 text-2xl">Analýza rizika online vs. desktopové programy</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
        <li>nic neinstalujete, funguje v prohlížeči na počítači i tabletu,</li>
        <li>dokument v editovatelném DOCX i PDF s vaším razítkem, logem a celou stopou výpočtu,</li>
        <li>každá hodnota má zdroj (tabulka nebo rovnice normy), výpočet je dohledatelný,</li>
        <li>platíte jen za hotovou analýzu – jednorázově bez registrace, nebo balíček a předplatné pro firmy.</li>
      </ul>

      <h2 className="mt-12 text-2xl">Na co nezapomenout</h2>
      <p className="mt-3 text-ink-soft">
        Výsledek je tak dobrý jako vstupní údaje. Zkontrolujte rozměry a výšku budovy, délku a provedení přípojek (u správce sítě), počty osob a požární riziko podle PBŘ.
        Výsledek aplikace je orientační a za jeho použití odpovídá zpracovatel s odpovídající kvalifikací.
      </p>

      <div className="mt-12">
        <FvsolPromo variant="results" context="analyza-rizika-lps" />
      </div>
      <p className="mt-8 text-sm">
        Další informace: <Link href="/analyza-rizika-fve" className="link">Analýza rizika u fotovoltaiky</Link> ·{" "}
        <Link href="/casto-kladene-otazky" className="link">Časté otázky</Link> · <Link href="/metodika" className="link">Metodika výpočtu</Link>
      </p>
    </article>
  );
}
