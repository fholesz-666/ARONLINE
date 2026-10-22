import type { Metadata } from "next";
import Link from "next/link";
import { OPERATOR } from "@/config/operator";
import { getSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Kontakty",
  description: "Kontakt na provozovatele aplikace ARONLINE pro analýzu rizika ochrany před bleskem – e-mail, telefon, fakturační údaje.",
  alternates: { canonical: "/kontakty" },
};
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const { operator, texts } = await getSettings();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl">Kontakty</h1>
      <p className="mt-3 max-w-[65ch] whitespace-pre-line text-ink-soft">{texts.contactIntro}</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-lg">Aplikace ARONLINE</h2>
          <p className="mt-1 text-sm text-ink-soft">Dotazy k účtu, platbám, dokladům, reklamace</p>
          <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-y-2">
            <dt className="text-ink-soft">E-mail</dt>
            <dd>
              <a className="link font-semibold" href={`mailto:${operator.email}`}>
                {operator.email}
              </a>
            </dd>
            {operator.phone && (
              <>
                <dt className="text-ink-soft">Telefon</dt>
                <dd>
                  <a className="link" href={`tel:${operator.phone.replace(/\s+/g, "")}`}>
                    {operator.phone}
                  </a>
                </dd>
              </>
            )}
            {texts.contactHours && (
              <>
                <dt className="text-ink-soft">Dostupnost</dt>
                <dd>{texts.contactHours}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="panel p-5">
          <h2 className="text-lg">Provozovatel</h2>
          <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-y-2">
            <dt className="text-ink-soft">Jméno</dt>
            <dd>{operator.name}</dd>
            {operator.ico && (
              <>
                <dt className="text-ink-soft">IČO</dt>
                <dd>{operator.ico}</dd>
              </>
            )}
            {operator.dic && (
              <>
                <dt className="text-ink-soft">DIČ</dt>
                <dd>{operator.dic}</dd>
              </>
            )}
            {operator.address && (
              <>
                <dt className="text-ink-soft">Sídlo</dt>
                <dd>{operator.address}</dd>
              </>
            )}
            <dt className="text-ink-soft">DPH</dt>
            <dd>{operator.vatPayer ? "plátce DPH" : "neplátce DPH"}</dd>
          </dl>
          {operator.registry && <p className="mt-3 text-xs text-muted">{operator.registry}</p>}
        </section>
      </div>

      <section className="mt-6 border border-ink bg-sheet p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">FVSOL · projekce elektro</p>
        <h2 className="mt-1 text-lg">Projekt hromosvodu nebo fotovoltaiky na klíč</h2>
        <p className="mt-2 text-ink-soft">
          Potřebujete kompletní projektovou dokumentaci ochrany před bleskem (LPS) nebo fotovoltaické elektrárny (FVE), případně analýzu rizika zpracovanou
          projektantem? Napište na{" "}
          <a className="link" href={`mailto:${OPERATOR.projectEmail}`}>
            {OPERATOR.projectEmail}
          </a>{" "}
          nebo navštivte{" "}
          <a className="link" href="https://fvsol.cz/?utm_source=aronline&utm_medium=web&utm_campaign=kontakty" rel="noopener">
            fvsol.cz
          </a>
          .
        </p>
      </section>

      <p className="mt-8 text-sm text-muted">
        Související: <Link className="link" href="/pravni/obchodni-podminky">obchodní podmínky</Link> ·{" "}
        <Link className="link" href="/pravni/reklamace">reklamace</Link> ·{" "}
        <Link className="link" href="/pravni/ochrana-osobnich-udaju">ochrana osobních údajů</Link>
      </p>
    </div>
  );
}
