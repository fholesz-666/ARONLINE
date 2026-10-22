import type { Metadata } from "next";
import Link from "next/link";
import { FvsolPromo } from "@/components/fvsol";
import { getPublicProducts, PricingTable } from "@/components/pricing";
import { PCI_NOTE, recurrenceTerms } from "@/config/recurrence";
import { getSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Ceník analýzy rizika LPS – od 149 Kč",
  description: "Ceny analýzy rizika ochrany před bleskem: jednorázová analýza 149 Kč i bez registrace, balíček 20 analýz, předplatné pro projektanty a firmy.",
  alternates: { canonical: "/cenik" },
};
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const products = await getPublicProducts();
  const { operator, texts, bank } = await getSettings();
  const vat = operator.vatPayer;
  const subs = products.filter((p) => p.type === "SUBSCRIPTION");
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl">Ceník a podmínky tarifů</h1>
      <p className="mt-3 max-w-[70ch] text-ink-soft">
        {texts.pricingIntro} Registrace, vyplnění analýzy, výpočet a náhled výsledku jsou zdarma. Jednorázovou analýzu můžete koupit i bez registrace
        (pokračovat jako host); balíčky a předplatné vyžadují účet.
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
            <li>Předplatné se platí kartou formou opakované platby a obnovuje se automaticky každý měsíc ve stejné výši.</li>
            <li>Zrušit ho můžete kdykoli v sekci Předplatné a kredity. Platí do konce zaplaceného období.</li>
            <li>Měsíční limit analýz se počítá od data aktivace. Nevyčerpané analýzy se nepřevádějí. Po vyčerpání limitu můžete použít kredity.</li>
            <li>Firemní předplatné umožňuje pozvat do pracovního prostoru další kolegy.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl">Platby</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
            <li>Platbu kartou online zpracovává platební brána GoPay s.r.o. (karta, Apple Pay, Google Pay). Kredit se připíše po potvrzení platby, obvykle během několika sekund.</li>
            {bank.enabled && (
              <li>
                Jednorázovou analýzu a balíček můžete zaplatit i bankovním převodem (QR platba). Kredit se připíše po přijetí platby na účet, obvykle za 1–2 pracovní dny.
              </li>
            )}
            <li>Ke každé platbě se automaticky vystaví doklad (faktura), najdete ho v aplikaci a pošleme ho e-mailem.</li>
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
      {subs.length > 0 && (
        <section className="mt-12" id="opakovane-platby">
          <h2 className="text-xl">Parametry opakované platby (předplatné)</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {subs.map((p) => (
              <div key={p.code} className="panel p-4 text-sm">
                <p className="font-semibold">{p.name}</p>
                <dl className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-[10rem_1fr]">
                  {recurrenceTerms({ productName: p.name, priceHaler: Math.round(p.priceCzk * 100), periodMonths: 1, contactEmail: operator.email }).map((t) => (
                    <div key={t.label} className="contents">
                      <dt className="text-ink-soft">{t.label}</dt>
                      <dd>{t.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-3 max-w-[80ch] text-sm text-ink-soft">{PCI_NOTE} Souhlas s opakovanou platbou udělujete zaškrtnutím před platbou; založení opakované platby vám potvrdíme e-mailem.</p>
        </section>
      )}
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
