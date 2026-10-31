import type { Metadata } from "next";
import Link from "next/link";
import { LIABILITY_CONFIRMATION } from "@/config/liability";
import { FvsolPromo } from "@/components/fvsol";
import { LegalDraftNotice, Operator } from "@/components/legal";
import { PCI_NOTE, RECURRENCE_MAX_MONTHS } from "@/config/recurrence";
import { getSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Obchodní podmínky" };

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const { operator, bank } = await getSettings();
  const vat = operator.vatPayer;
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
          Aktuální ceny jsou uvedeny v <Link href="/cenik">ceníku</Link>. Ceny jsou konečné v Kč{vat ? " a zahrnují DPH" : "; provozovatel není plátcem DPH"}. Služba
          se poskytuje elektronicky, žádné náklady na dodání se neúčtují.
        </li>
        <li>
          Platit lze <strong>platební kartou online</strong> prostřednictvím platební brány GoPay s.r.o.
          {bank.enabled ? (
            <>
              {" "}
              nebo <strong>bankovním převodem</strong> na účet provozovatele {bank.account} s variabilním symbolem uvedeným v objednávce (jen jednorázová analýza a balíček)
            </>
          ) : null}
          . Provozovatel nemá přístup k údajům o platebních kartách.
        </li>
        <li>
          Jednorázová analýza a balíček analýz se hradí předem. Kredity se připíší po potvrzení platby platební bránou, u převodu po připsání platby na účet
          provozovatele (obvykle 1–2 pracovní dny). Neuhrazená objednávka převodem se po uplynutí splatnosti může zrušit. Kredity nemají omezenou platnost, nejsou
          převoditelné mimo pracovní prostor a nelze je směnit za peníze.
        </li>
        <li>Úhrada se považuje za provedenou až potvrzením platby platební bránou nebo připsáním na účet; samotné přesměrování z brány není potvrzením platby.</li>
        <li>
          Ke každé přijaté platbě (i k obnově předplatného) se automaticky vystaví doklad (faktura). Doklad je dostupný v aplikaci v sekci Předplatné a kredity
          a zasílá se e-mailem.
        </li>
      </ol>

      <h3 id="opakovane-platby">3.1 Předplatné a opakované platby</h3>
      <ol>
        <li>
          Předplatné se hradí výhradně platební kartou formou <strong>automatické opakované platby</strong> prostřednictvím GoPay s.r.o. Důvodem opakované platby je
          úhrada předplatného zvoleného tarifu.
        </li>
        <li>
          První platba se provede při objednávce. Další platby se strhávají automaticky <strong>jednou měsíčně</strong>, vždy v den odpovídající datu první platby
          (frekvence i datum jsou fixní), a to <strong>v pevné výši ceny tarifu platné v okamžiku objednávky</strong>; tato částka je zároveň nejvyšší částkou jedné
          opakované platby.
        </li>
        <li>
          Opakovaná platba se zakládá na dobu neurčitou do jejího zrušení, nejdéle však na {RECURRENCE_MAX_MONTHS / 12} let od založení.
        </li>
        <li>
          Před založením opakované platby se zákazníkovi na samostatném místě objednávky zobrazí její parametry. Opakovaná platba se založí jen po výslovném
          souhlasu zákazníka (zaškrtnutím) s jejími parametry a s uložením údajů o platební kartě u GoPay. {PCI_NOTE} Souhlas včetně zobrazených parametrů, data
          a času provozovatel uchovává po dobu trvání předplatného a nejméně 12 měsíců po jeho skončení.
        </li>
        <li>
          Založení opakované platby provozovatel potvrdí zákazníkovi e-mailem nejpozději do 2 pracovních dnů. O každé další platbě zákazník obdrží e-mail s dokladem.
        </li>
        <li>
          Provozovatel bude zákazníka informovat e-mailem nejméně 7 pracovních dní předem o jakékoli změně parametrů opakované platby (např. výše částky nebo
          frekvence) a před stržením platby, pokud od předchozí opakované platby uplynulo více než 6 měsíců. Změna ceny tarifu v ceníku se na již založené opakované
          platby nevztahuje.
        </li>
        <li>
          <strong>Zrušení:</strong> zákazník může opakovanou platbu kdykoli zrušit v aplikaci tlačítkem „Zrušit předplatné“ v sekci Předplatné a kredity, nebo
          e-mailem na <a href={`mailto:${operator.email}`}>{operator.email}</a>. Zrušením se okamžitě zastaví další platby; předplatné lze využívat do konce již
          zaplaceného období, již uhrazená částka se nevrací. Zrušení provozovatel potvrdí e-mailem.
        </li>
        <li>
          Změnu nastavení opakované platby (např. změnu tarifu) lze provést zrušením stávajícího předplatného a objednáním nového, případně po dohodě e-mailem na{" "}
          {operator.email}.
        </li>
        <li>Pokud se opakovanou platbu nepodaří strhnout ani po opakovaných pokusech, předplatné skončí uplynutím zaplaceného období.</li>
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
          Spotřebitel může od smlouvy odstoupit bez udání důvodu do 14 dnů od jejího uzavření, a to e-mailem na {operator.email}; provozovatel vrátí přijatou
          platbu do 14 dnů stejným platebním prostředkem. Odstoupit nelze od smlouvy o dodání digitálního obsahu, pokud byl obsah se souhlasem spotřebitele
          zpřístupněn před uplynutím lhůty (§ 1837 písm. l) občanského zákoníku): odemčením analýzy spotřebitel výslovně žádá o okamžité zpřístupnění dokumentace
          a bere na vědomí, že tím u odemčené analýzy právo na odstoupení zaniká. U balíčku se vrací poměrná část za nevyčerpané kredity, u předplatného poměrná část
          za dny do odstoupení, pokud v něm dosud nebyla odemčena žádná analýza. Tím nejsou dotčena práva z vadného plnění (čl. 7).
        </li>
      </ol>

      <h2>5. Povaha služby a výsledků</h2>
      <ol>
        <li>
          <strong>Výsledek výpočtu je orientační odhad</strong> vypočtený ze zadaných a převzatých údajů. Nejde o odborné posouzení, znalecký posudek ani
          garantovaný normově správný výsledek. Provozovatel nezaručuje, že výsledek odpovídá skutečným poměrům stavby ani požadavkům normy v konkrétním případě.
        </li>
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
          <strong>Provozovatel neručí za správnost, úplnost ani použitelnost výsledků výpočtu, vstupních údajů, převzatých dat ani dokumentace</strong> a nenese
          odpovědnost za škody vzniklé jejich použitím, zejména za škody na stavbách, zařízeních, zdraví, ušlý zisk, náklady na přepracování dokumentace nebo
          za sankce uložené zpracovateli či investorovi.
        </li>
        <li>
          Služba je poskytována „tak, jak je“. Provozovatel nezaručuje nepřetržitou dostupnost služby, bezchybnost výpočetního jádra ani shodu výsledků
          s jinými výpočetními programy.
        </li>
        <li>
          Kontrolu výpočtu, zadaných hodnot, převzatých údajů i závěrů provádí výhradně zpracovatel. Použitím výsledku v projektové dokumentaci jej zpracovatel
          přebírá za vlastní a odpovídá za něj vůči investorovi i třetím osobám. Zpracovatel odškodní provozovatele, pokud by vůči němu třetí osoba uplatnila
          nárok vzniklý z použití výsledku.
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
        Webové stránky služby obsahují odkaz na služby projekce FVE a ochrany před bleskem FVSOL (fvsol.cz); vygenerované dokumenty tento odkaz neobsahují. Využití těchto služeb je dobrovolné a řídí se
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
