import type { Metadata } from "next";
import { LegalDraftNotice, Operator } from "@/components/legal";

export const metadata: Metadata = { title: "Reklamace a řešení chyb" };

export default function ComplaintsPage() {
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl">Reklamační řád a řešení chyb</h1>
      <LegalDraftNotice />

      <h2>1. Co lze reklamovat</h2>
      <ul>
        <li>chybu aplikace nebo výpočetního jádra (výpočet neodpovídá zvolené metodice při správně zadaných vstupech),</li>
        <li>chybu při generování dokumentu (chybějící nebo poškozený obsah PDF/DOCX),</li>
        <li>zaplacenou analýzu, kterou nelze odemknout nebo stáhnout,</li>
        <li>platbu, která byla stržena, ale nebyla připsána (kredit, odemčení, předplatné).</li>
      </ul>

      <h2>2. Co není vadou služby</h2>
      <ul>
        <li>chyba nebo neúplnost vstupních údajů zadaných zpracovatelem,</li>
        <li>nepřesnost údajů převzatých z veřejných zdrojů (ČÚZK, RÚIAN, výškopis, mapa bouřkových dnů), které měl zpracovatel ověřit,</li>
        <li>volba parametrů nebo předvoleb, která neodpovídá skutečnému stavu stavby,</li>
        <li>odlišný výsledek jiného výpočetního programu, pokud služba počítá v souladu se zvolenou metodikou (rozdíly mezi programy uvádí stránka Metodika),</li>
        <li>ztráta přístupu hosta po zániku relace v prohlížeči (host si má dokumenty uložit nebo dokončit registraci).</li>
      </ul>

      <h2>3. Jak reklamaci uplatnit</h2>
      <ol>
        <li>Pošlete e-mail provozovateli (<Operator />).</li>
        <li>Uveďte číslo objednávky nebo ID výpočtu (je v zápatí každého dokumentu), e-mail použitý při platbě a popis chyby.</li>
        <li>
          U chyby výpočtu uveďte, v čem se výsledek liší od očekávání a z jakého podkladu vycházíte (číslo tabulky nebo rovnice normy, případně protokol z jiného programu se
          stejnými vstupy).
        </li>
        <li>Reklamaci je třeba uplatnit bez zbytečného odkladu, nejpozději do 6 měsíců od zaplacení dotčené analýzy.</li>
      </ol>

      <h2>4. Lhůty</h2>
      <p>Přijetí reklamace potvrdíme e-mailem do 3 pracovních dnů. Reklamaci vyřídíme bez zbytečného odkladu, nejpozději do 30 dnů od doručení.</p>

      <h2>5. Způsob vyřízení</h2>
      <ul>
        <li>Oprávněná reklamace chyby aplikace nebo výpočetního jádra: oprava, nový výpočet a vrácení kreditu, popřípadě ceny za dotčenou analýzu.</li>
        <li>Platba stržena, ale nepřipsána: dořešení s platební bránou a připsání plnění, nebo vrácení peněz stejnou cestou, jakou byly zaplaceny.</li>
        <li>Neoprávněná reklamace: písemné zdůvodnění zamítnutí.</li>
        <li>Peníze vracíme do 14 dnů od uznání reklamace. Vrácením ceny se odemčená analýza znovu uzamkne.</li>
      </ul>

      <h2>6. Dohledatelnost výpočtu</h2>
      <p>
        Každý výpočet je uložen včetně vstupů, verze výpočetního jádra a otisku normativních dat. Po opravě jádra lze původní výpočet dohledat a porovnat s novým.
      </p>

      <h2>7. Mimosoudní řešení</h2>
      <p>
        Služba je určena podnikatelům. Spory se řeší přednostně dohodou; nedojde-li k dohodě, rozhoduje příslušný soud České republiky.
      </p>
    </article>
  );
}
