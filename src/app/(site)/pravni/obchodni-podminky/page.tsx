import type { Metadata } from "next";
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
      <p>
        Provozovatelem webové aplikace ARONLINE (dále „služba“) je <Operator />. Služba umožňuje registrovaným uživatelům připravit vstupní údaje, provést výpočet analýzy
        rizika ochrany před bleskem podle zvolené metodiky a po zaplacení stáhnout dokumentaci ve formátech PDF a DOCX.
      </p>
      <p>
        Služba je určena podnikatelům a odborníkům (projektantům, revizním technikům, realizačním firmám). Uživatel jedná v rámci své podnikatelské činnosti, pokud
        výslovně neuvede jinak.
      </p>

      <h2>2. Uživatelský účet</h2>
      <ol>
        <li>Pro užívání služby je nutná registrace. Uživatel odpovídá za pravdivost údajů a za ochranu přístupových údajů.</li>
        <li>Provozovatel může účet zablokovat při porušení podmínek, zneužití služby nebo ohrožení bezpečnosti.</li>
      </ol>

      <h2>3. Ceny a platby</h2>
      <ol>
        <li>Aktuální ceny jsou uvedeny v ceníku. Ceny jsou konečné{vat ? " a zahrnují DPH" : "; provozovatel není plátcem DPH"}.</li>
        <li>
          Jednorázová analýza a balíček analýz se hradí předem. Kredity se připíší po potvrzení platby platební bránou. Kredity nemají omezenou platnost, nejsou převoditelné
          mimo pracovní prostor a nelze je směnit za peníze.
        </li>
        <li>
          Předplatné se hradí kartou a automaticky se obnovuje po uplynutí zaplaceného období. Uživatel může předplatné kdykoli zrušit. Zrušení se projeví ke konci zaplaceného
          období, již uhrazená částka se nevrací.
        </li>
        <li>Platby zpracovává GoPay s.r.o. Provozovatel nemá přístup k údajům o platebních kartách.</li>
      </ol>

      <h2>4. Odemčení analýzy</h2>
      <ol>
        <li>Odemčením se zpřístupní dokumentace analýzy jednoho objektu (jedna budova na jedné adrese nebo parcele).</li>
        <li>
          Po odemčení lze výpočet téhož objektu upravovat a dokumentaci stahovat opakovaně. Identifikaci objektu (adresu, polohu, parcelu) po odemčení nelze změnit. Analýza
          jiného objektu je samostatná analýza.
        </li>
      </ol>

      <h2>5. Povaha výsledků a odpovědnost</h2>
      <ol>
        <li>
          Služba provádí výpočet ze zadaných a převzatých údajů podle zvolené metodiky a zpracovává z něj dokument. Služba nenahrazuje odbornou činnost zpracovatele. Zpracovatel
          odpovídá za správnost, úplnost a aktuálnost vstupních údajů, za volbu parametrů a za posouzení výsledku v kontextu konkrétní stavby.
        </li>
        <li>
          Údaje převzaté z veřejných zdrojů (např. ČÚZK) jsou orientační. Provozovatel neodpovídá za jejich správnost ani dostupnost. Zpracovatel je povinen je ověřit.
        </li>
        <li>
          Stav odborného ověření výpočetního jádra je zveřejněn na stránce Metodika. Dokumenty z neověřeného jádra jsou výslovně označeny.
        </li>
        <li>
          Odpovědnost provozovatele za škodu je omezena na výši ceny zaplacené za dotčenou analýzu, nebo za poslední měsíc předplatného, s výjimkou škody způsobené úmyslně nebo
          hrubou nedbalostí.
        </li>
      </ol>

      <h2>6. Reklamace</h2>
      <p>Postup při reklamaci a hlášení chyb výpočtu je popsán na stránce Reklamace a řešení chyb.</p>

      <h2>7. Ochrana dat</h2>
      <p>Zpracování osobních údajů upravují Zásady ochrany osobních údajů. Projektová data uživatele nejsou zpřístupněna jiným uživatelům mimo jeho pracovní prostor.</p>

      <h2>8. Závěrečná ustanovení</h2>
      <ol>
        <li>Právní vztahy se řídí právem České republiky.</li>
        <li>Provozovatel může podmínky změnit. O změně informuje uživatele e-mailem nejméně 14 dní předem. Nesouhlasí-li uživatel, může účet zrušit.</li>
      </ol>
    </article>
  );
}
