import type { Metadata } from "next";

export const metadata: Metadata = { title: "O aplikaci", alternates: { canonical: "/o-aplikaci" } };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl">O aplikaci</h1>
      <p className="mt-4 text-ink-soft">
        ARONLINE vznikl z praxe projektanta fotovoltaických elektráren a ochrany před bleskem. Cílem je zkrátit přípravu analýzy rizika na minimum ručního přepisování a
        přitom zachovat dohledatelný a ověřitelný výpočet.
      </p>
      <h2 className="mt-8 text-xl">Související služby</h2>
      <p className="mt-2 text-ink-soft">
        Potřebujete kompletní projektovou dokumentaci fotovoltaické elektrárny (FVE) nebo ochrany před bleskem (LPS)? Více informací naleznete na{" "}
        <a className="link" href="https://fvsol.cz" rel="noopener">
          fvsol.cz
        </a>
        .
      </p>
    </div>
  );
}
