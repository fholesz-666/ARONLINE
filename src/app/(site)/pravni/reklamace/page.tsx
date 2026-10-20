import type { Metadata } from "next";
import { LegalDraftNotice, Operator } from "@/components/legal";

export const metadata: Metadata = { title: "Reklamace a řešení chyb" };

export default function ComplaintsPage() {
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl">Reklamace a řešení chyb</h1>
      <LegalDraftNotice />

      <h2>Jak nahlásit chybu</h2>
      <ol>
        <li>Pošlete e-mail provozovateli (<Operator />).</li>
        <li>Uveďte číslo objednávky nebo ID výpočtu (je v zápatí každého dokumentu) a popis chyby.</li>
        <li>U chyby výpočtu uveďte, v čem se výsledek liší od očekávání a z jakého podkladu vycházíte (číslo tabulky nebo rovnice normy).</li>
      </ol>

      <h2>Lhůty</h2>
      <p>Reklamaci vyřídíme bez zbytečného odkladu, nejpozději do 30 dnů od doručení.</p>

      <h2>Způsob vyřízení</h2>
      <ul>
        <li>Chyba aplikace nebo výpočetního jádra: oprava, nový výpočet a vrácení kreditu (popřípadě ceny) za dotčenou analýzu.</li>
        <li>Nedostupnost služby nebo neúspěšné připsání platby: dořešení platby nebo vrácení peněz.</li>
        <li>Chyba ve vstupních údajích zadaných zpracovatelem nebo převzatých z veřejných zdrojů není vadou služby.</li>
      </ul>

      <h2>Dohledatelnost výpočtu</h2>
      <p>
        Každý výpočet je uložen včetně vstupů, verze výpočetního jádra a otisku normativních dat. Po opravě jádra lze původní výpočet dohledat a porovnat s novým.
      </p>
    </article>
  );
}
