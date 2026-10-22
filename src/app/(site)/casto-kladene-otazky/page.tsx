import type { Metadata } from "next";
import Link from "next/link";
import { FvsolPromo } from "@/components/fvsol";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Časté otázky – analýza rizika ochrany před bleskem",
  description:
    "Odpovědi na časté otázky k analýze rizika LPS: podle jaké normy, kolik stojí, jak dlouho trvá, co když vyjde riziko vyšší než přípustné, ed. 2 vs. ed. 3 a odpovědnost zpracovatele.",
  alternates: { canonical: "/casto-kladene-otazky" },
};

const FAQ: [string, string][] = [
  [
    "Podle jaké normy se analýza rizika počítá?",
    "Podle ČSN EN 62305-2 ed. 2 (Ochrana před bleskem – Řízení rizika), kterou lze používat do 31. 10. 2027. Souběžně platí ČSN EN IEC 62305-2 ed. 3; výpočet podle ed. 3 doplníme do aplikace od 10/2027.",
  ],
  [
    "Kolik analýza rizika stojí?",
    "Výpočet i náhled výsledku jsou zdarma. Za stažení dokumentace zaplatíte 149 Kč za jednu analýzu (i bez registrace), balíček 20 analýz stojí 1 490 Kč, firmy mohou využít měsíční předplatné.",
  ],
  [
    "Jak dlouho výpočet trvá?",
    "U rodinného domu obvykle 10–15 minut. Budovu a okolí aplikace načte z katastru, bouřkové dny podle polohy a typické hodnoty podle druhu objektu – doplníte jen přípojky a údaje o provozu.",
  ],
  [
    "Co když vyjde riziko vyšší než přípustné?",
    "Aplikace ukáže, které složky rizika převažují a jaká opatření je ovlivní – třída LPS, SPD na vstupu vedení, koordinované SPD, stínění nebo protipožární opatření. Opatření zadáte a výpočet zopakujete.",
  ],
  [
    "Může analýzu zpracovat kdokoli?",
    "Aplikace je určena projektantům a odborníkům na ochranu před bleskem. Zpracovatel potvrzuje, že má potřebnou kvalifikaci, a odpovídá za vstupní údaje i kontrolu výsledku. Výsledek je orientační výpočet ze zadaných údajů.",
  ],
  [
    "Ve kterém formátu dostanu dokumentaci?",
    "V PDF a v editovatelném DOCX (Word) s vaším razítkem, logem, tabulkami výsledků a úplnou stopou výpočtu s odkazy na tabulky a rovnice normy.",
  ],
  [
    "Liší se výsledek od programu Prozik nebo DEHNrisk?",
    "Základní výpočet je stejný. Programy se mohou lišit v interpretaci některých bodů normy a v přepočtu bouřkových dnů na hustotu úderů. Rozdíly a jejich důvody popisujeme na stránce Metodika.",
  ],
  [
    "Potřebuji kromě analýzy i projekt hromosvodu?",
    "Analýza rizika určuje, zda a jaká ochrana je potřeba. Návrh jímací soustavy, svodů, uzemnění a přepěťových ochran je samostatný projekt – zpracujeme ho na fvsol.cz.",
  ],
];

export default function FaqPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        }}
      />
      <h1 className="text-3xl">Časté otázky k analýze rizika ochrany před bleskem</h1>
      <div className="mt-8 space-y-6">
        {FAQ.map(([q, a]) => (
          <section key={q}>
            <h2 className="text-lg">{q}</h2>
            <p className="mt-1 text-ink-soft">{a}</p>
          </section>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/prihlaseni" className="btn btn-primary">
          Začít analýzu
        </Link>
        <Link href="/analyza-rizika-lps" className="btn btn-secondary">
          Průvodce analýzou rizika LPS
        </Link>
      </div>
      <div className="mt-12">
        <FvsolPromo context="faq" />
      </div>
    </article>
  );
}
