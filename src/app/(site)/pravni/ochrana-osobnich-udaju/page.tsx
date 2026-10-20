import type { Metadata } from "next";
import { LegalDraftNotice, Operator } from "@/components/legal";

export const metadata: Metadata = { title: "Ochrana osobních údajů" };

export default function PrivacyPage() {
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl">Zásady ochrany osobních údajů</h1>
      <LegalDraftNotice />

      <h2>1. Správce</h2>
      <p>
        Správcem osobních údajů je <Operator />.
      </p>

      <h2>2. Jaké údaje zpracováváme a proč</h2>
      <ul>
        <li>
          <strong>Účet</strong> – jméno, e-mail, otisk hesla (heslo v čitelné podobě neukládáme). Účel: poskytování služby (plnění smlouvy).
        </li>
        <li>
          <strong>Host bez registrace</strong> – technický identifikátor relace a e-mail zadaný pro doklad o platbě (předává se platební bráně). Účel: plnění smlouvy.
          Nedokončený účet hosta bez zaplacené analýzy mažeme do 60 dnů od poslední aktivity.
        </li>
        <li>
          <strong>Údaje zpracovatele do razítka</strong> – jméno, firma, IČO, adresa, kontakty, logo. Účel: generování dokumentace (plnění smlouvy).
        </li>
        <li>
          <strong>Projektová data</strong> – údaje o stavbě, investorovi a výpočtu. Mohou obsahovat osobní údaje investora (jméno, adresa). Účel: poskytování služby. Uživatel
          odpovídá za oprávněnost jejich zadání.
        </li>
        <li>
          <strong>Objednávky a platby</strong> – číslo objednávky, produkt, částka, stav platby. Údaje o kartě zpracovává výhradně GoPay. Účel: plnění smlouvy, účetní a daňové
          povinnosti.
        </li>
        <li>
          <strong>Bezpečnostní záznamy</strong> – čas přihlášení, technické záznamy o důležitých akcích bez obsahu projektů. Účel: oprávněný zájem na zabezpečení služby.
        </li>
        <li>
          <strong>Potvrzení odpovědnosti zpracovatele</strong> – datum, verze textu a identifikace projektu, u kterého zpracovatel potvrdil prohlášení o odpovědnosti. Účel:
          oprávněný zájem provozovatele na prokázání sjednaných podmínek (po dobu 10 let).
        </li>
      </ul>

      <h2>3. Příjemci a zpracovatelé</h2>
      <ul>
        <li>poskytovatel hostingu a databáze (servery v EU – doplnit konkrétního poskytovatele),</li>
        <li>GoPay s.r.o. – platby,</li>
        <li>poskytovatel odesílání e-mailů (doplnit),</li>
        <li>Český úřad zeměměřický a katastrální – službě se předávají jen souřadnice a hledaný text adresy, nikoliv osobní údaje uživatele.</li>
      </ul>

      <h2>4. Doba uložení</h2>
      <ul>
        <li>údaje účtu a projekty – po dobu existence účtu, poté smazání do 30 dnů (zálohy do 35 dnů),</li>
        <li>účetní doklady – po dobu stanovenou právními předpisy (zpravidla 10 let),</li>
        <li>bezpečnostní záznamy – 12 měsíců,</li>
        <li>účty hostů bez zaplacené analýzy – 60 dnů od poslední aktivity.</li>
      </ul>

      <h2>5. Vaše práva</h2>
      <p>
        Máte právo na přístup, opravu, výmaz, omezení zpracování, přenositelnost údajů a vznést námitku. Stížnost můžete podat u Úřadu pro ochranu osobních údajů (uoou.gov.cz).
        Žádosti zasílejte na kontaktní e-mail správce.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Služba používá pouze nezbytnou cookie pro přihlášení (relace – i u hosta). Analytické ani reklamní cookies nepoužívá. Odkazy na fvsol.cz obsahují označení zdroje
        (UTM parametr) bez osobních údajů.
      </p>

      <h2>7. Zabezpečení</h2>
      <p>
        Data jsou přenášena šifrovaně (HTTPS), hesla jsou uložena jako otisk (Argon2), přístup k projektům je oddělen po pracovních prostorech a ověřován na serveru.
      </p>
    </article>
  );
}
