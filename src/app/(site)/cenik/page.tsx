import type { Metadata } from "next";
import Link from "next/link";
import { FvsolPromo } from "@/components/fvsol";
import { getPublicProducts, PricingTable } from "@/components/pricing";

export const metadata: Metadata = { title: "Ceník" };
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const products = await getPublicProducts();
  const vat = process.env.OPERATOR_VAT_PAYER === "true";
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl">Ceník a podmínky tarifů</h1>
      <p className="mt-3 max-w-[70ch] text-ink-soft">
        Registrace, vyplnění analýzy, výpočet a náhled výsledku jsou zdarma. Platí se za odemčení dokumentace (PDF a DOCX) konkrétního objektu.
        Jednorázovou analýzu můžete koupit i bez registrace (pokračovat jako host); balíčky a předplatné vyžadují účet.
      </p>
      <div className="mt-8">
        <PricingTable products={products} />
      </div>

      <div className="mt-10">
        <FvsolPromo context="cenik" />
      </div>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="text-xl">Co znamená jedna analýza</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
            <li>Jedna analýza = jeden objekt (jedna budova na jedné adrese nebo parcele).</li>
            <li>Bez registrace (jako host) lze koupit jen jednorázovou analýzu; přístup k ní je vázán na prohlížeč, dokud si nedokončíte účet.</li>
            <li>Po odemčení můžete výpočet téhož objektu dál upravovat a dokumentaci stahovat opakovaně bez dalšího poplatku.</li>
            <li>Adresa, poloha a parcela odemčeného projektu se už nedají změnit. Pro jiný objekt vytvořte kopii projektu – ta se odemyká samostatně.</li>
            <li>Kredity z balíčku nemají omezenou platnost a sdílí je celý pracovní prostor.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl">Předplatné</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
            <li>Předplatné se platí kartou a obnovuje se automaticky každý měsíc.</li>
            <li>Zrušit ho můžete kdykoli v sekci Předplatné a kredity. Platí do konce zaplaceného období.</li>
            <li>Měsíční limit analýz se počítá od data aktivace. Nevyčerpané analýzy se nepřevádějí. Po vyčerpání limitu můžete použít kredity.</li>
            <li>Firemní předplatné umožňuje pozvat do pracovního prostoru další kolegy.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl">Platby</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
            <li>Platby zpracovává platební brána GoPay (karta, bankovní převod, Apple Pay, Google Pay).</li>
            <li>Kredit nebo předplatné se připíše po potvrzení platby platební bránou, obvykle během několika sekund.</li>
            <li>Ceny jsou konečné{vat ? " včetně DPH" : ", provozovatel není plátcem DPH"}.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl">Co v ceně není</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
            <li>Návrh vnější a vnitřní ochrany před bleskem (jímače, svody, uzemnění, SPD) – ten je předmětem projektové dokumentace.</li>
            <li>Ověření vstupních údajů – za správnost zadaných a převzatých hodnot odpovídá zpracovatel.</li>
          </ul>
        </section>
      </div>
      <p className="mt-10 text-sm text-muted">
        Podrobné podmínky najdete v{" "}
        <Link className="link" href="/pravni/obchodni-podminky">
          obchodních podmínkách
        </Link>
        .
      </p>
    </div>
  );
}
