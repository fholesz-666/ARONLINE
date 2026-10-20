import type { Metadata } from "next";
import Link from "next/link";
import { LIABILITY_CONFIRMATION } from "@/config/liability";
import { FvsolPromo } from "@/components/fvsol";
import { LegalDraftNotice, Operator } from "@/components/legal";

export const metadata: Metadata = { title: "Obchodní podmínky" };

export default function TermsPage() {
  const vat = process.env.OPERATOR_VAT_PAYER === "true";
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl">Obchodní podmínky služby ARONLINE</h1>
      <LegalDraftNotice />
      <p className="mt-4 text-sm text-muted">Verze: {process.env.TERMS_VERSION ?? "2026-10-návrh"}</p>

      <h2>1. Provozovatel a předmět služby</h2>
      <ol>
        <li>
          Provozovatelem webové aplikace ARONLINE (dále „služba“) je <Operator /> (dále „provozovatel“).
        </li>
        <li>
          Služba je výpočetní pomůcka. Umožňuje připravit vstupní údaje, provést výpočet analýzy (ověření) rizika ochrany před bleskem podle ČSN EN 62305-2 ed. 2 a po
          zaplacení stáhnout dokumentaci ve formátech PDF a DOCX. Výpočet podle ČSN EN IEC 62305-2 ed. 3 bude do služby doplněn od 10/2027.
        </li>
        <li>
          Služba je určena odborníkům – projektantům, revizním technikům a realizačním firmám. Uživatel (dále „zpracovatel“) jedná v rámci své podnikatelské nebo
          odborné činnosti. Služba není určena spotřebitelům.
        </li>
      </ol>

      <h2>2. Přístup ke službě – účet a host</h2>
      <ol>
        <li>
          <strong>Host bez registrace.</strong> Jednorázovou analýzu lze zpracovat a zaplatit bez registrace (volba „Pokračovat jako host“). Pro doklad o platbě zadá host
          svůj e-mail. Přístup k analýze je vázán na relaci v prohlížeči (platnost 30 dní); po jejím zániku nelze analýzu obnovit, pokud si host nedokončí registraci.
          Host si proto stažené dokumenty uloží. Host může kdykoli dokončit registraci – jeho analýzy i zaplacené dokumenty zůstanou zachovány.
        </li>
        <li>
          <strong>Registrovaný uživatel.</strong> Balíčky analýz, předplatné, týmy a šablony vyžadují registraci. Uživatel odpovídá za pravdivost údajů a za ochranu
          přístupových údajů.
        </li>
        <li>Provozovatel může účet nebo přístup hosta zablokovat při porušení podmínek, zneužití služby nebo ohrožení bezpečnosti.</li>
      </ol>

      <h2>3. Ceny a platby</h2>
      <ol>
        <li>
          Aktuální ceny jsou uvedeny v <Link href="/cenik">ceníku</Link>. Ceny jsou konečné{vat ? " a zahrnují DPH" : "; provozovatel není plátcem DPH"}.
        </li>
        <li>
          Jednorázová analýza a balíček analýz se hradí předem. Kredity se připíší po potvrzení platby platební bránou. Kredity nemají omezenou platnost, nejsou převoditelné
          mimo pracovní prostor a nelze je směnit za peníze.
        </li>
        <li>
          Předplatné se hradí kartou a automaticky se obnovuje po uplynutí zaplaceného období. Uživatel může předplatné kdykoli zrušit. Zrušení se projeví ke konci zaplaceného
          období, již uhrazená částka se nevrací.
        </li>
        <li>Platby zpracovává GoPay s.r.o. Provozovatel nemá přístup k údajům o platebních kartách.</li>
        <li>Úhrada se považuje za provedenou až potvrzením platby platební bránou; samotné přesměrování z brány není potvrzením platby.</li>
      </ol>

      <h2>4. Odemčení analýzy</h2>
      <ol>
        <li>Odemčením se zpřístupní dokumentace analýzy jednoho objektu (jedna budova na jedné adrese nebo parcele).</li>
        <li>
          Po odemčení lze výpočet téhož objektu upravovat a dokumentaci stahovat opakovaně. Identifikaci objektu (adresu, polohu, parcelu) po odemčení nelze změnit. Analýza
          jiného objektu je samostatná analýza.
        </li>
        <li>
          Před zaplacením nebo odemčením musí zpracovatel potvrdit prohlášení o odpovědnosti (čl. 6). Bez potvrzení nelze dokumentaci odemknout. Potvrzení se ukládá
          s datem a verzí textu.
        </li>
        <li>
          Vzhledem k povaze digitálního obsahu, který je zpřístupněn ihned po zaplacení, nelze po odemčení od smlouvy odstoupit; tím nejsou dotčena práva z vadného plnění
          (čl. 7).
        </li>
      </ol>

      <h2>5. Povaha služby</h2>
      <ol>
        <li>
          Služba provádí výpočet ze zadaných a převzatých údajů podle zvolené metodiky a zpracovává z něj dokument. Služba nenahrazuje odbornou činnost zpracovatele ani
          autorizaci projektové dokumentace.
        </li>
        <li>
          Údaje převzaté automaticky (např. z ČÚZK, RÚIAN, výškopisu, mapy bouřkových dnů ČHMÚ) jsou orientační. Provozovatel neodpovídá za jejich správnost, úplnost ani
          dostupnost.
        </li>
        <li>
          Typické hodnoty nabízené ve formuláři (předvolby) nejsou univerzálně správné pro každou stavbu. Jejich použití posuzuje zpracovatel.
        </li>
      </ol>

      <h2>6. Odpovědnost zpracovatele a vyloučení záruky provozovatele</h2>
      <ol>
        <li>
          <strong>Zpracovatel odpovídá za správnost, úplnost a aktuálnost všech zadaných i převzatých vstupních údajů, za volbu parametrů, za kontrolu výsledku výpočtu a za
          jeho použití v projektové nebo jiné dokumentaci.</strong>
        </li>
        <li>
          Službu smí pro zpracování analýzy rizika používat jen osoba, která má odbornou kvalifikaci potřebnou ke zpracování analýzy rizika ochrany před bleskem podle
          příslušných norem a předpisů. Zpracovatel tuto kvalifikaci potvrzuje před odemčením každé analýzy.
        </li>
        <li>
          <strong>Provozovatel neručí za správnost výsledků výpočtu, vstupních údajů, převzatých dat ani dokumentace</strong> a nenese odpovědnost za škody vzniklé jejich
          použitím, zejména za škody na stavbách, zařízeních, zdraví nebo za sankce uložené zpracovateli či investorovi.
        </li>
        <li>
          Před odemčením dokumentace zpracovatel potvrzuje toto prohlášení: <em>„{LIABILITY_CONFIRMATION}“</em>
        </li>
        <li>
          Je-li odpovědnost provozovatele dána kogentním ustanovením právního předpisu, je omezena na výši ceny zaplacené za dotčenou analýzu, nebo za poslední měsíc
          předplatného; to neplatí pro škodu způsobenou úmyslně nebo z hrubé nedbalosti.
        </li>
      </ol>

      <h2>7. Reklamace</h2>
      <p>
        Postup při reklamaci a hlášení chyb výpočtu je popsán na stránce <Link href="/pravni/reklamace">Reklamace a řešení chyb</Link>. Chyba ve vstupních údajích zadaných
        zpracovatelem nebo převzatých z veřejných zdrojů není vadou služby.
      </p>

      <h2>8. Ochrana dat</h2>
      <p>
        Zpracování osobních údajů upravují <Link href="/pravni/ochrana-osobnich-udaju">Zásady ochrany osobních údajů</Link>. Projektová data uživatele nejsou zpřístupněna
        jiným uživatelům mimo jeho pracovní prostor.
      </p>

      <h2>9. Odkazy na související služby</h2>
      <p>
        Služba a vygenerované dokumenty obsahují odkaz na služby projekce FVE a ochrany před bleskem FVSOL (fvsol.cz). Využití těchto služeb je dobrovolné a řídí se
        samostatnou smlouvou.
      </p>

      <h2>10. Závěrečná ustanovení</h2>
      <ol>
        <li>Právní vztahy se řídí právem České republiky.</li>
        <li>Provozovatel může podmínky změnit. O změně informuje registrované uživatele e-mailem nejméně 14 dní předem. Nesouhlasí-li uživatel, může účet zrušit.</li>
      </ol>

      <div className="mt-10 not-prose">
        <FvsolPromo context="obchodni-podminky" />
      </div>
    </article>
  );
}
