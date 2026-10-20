import Link from "next/link";
import { getCurrent } from "@/server/auth/session";
import { Brand } from "./brand";

export async function SiteHeader() {
  let loggedIn = false;
  try {
    loggedIn = (await getCurrent()) != null;
  } catch {
    loggedIn = false;
  }
  return (
    <header className="border-b border-line bg-sheet">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Brand />
        <nav className="flex items-center gap-1 text-[0.9375rem]" aria-label="Hlavní navigace">
          <Link href="/cenik" className="btn btn-ghost hidden sm:inline-flex">
            Ceník
          </Link>
          <Link href="/metodika" className="btn btn-ghost hidden sm:inline-flex">
            Metodika
          </Link>
          {loggedIn ? (
            <Link href="/app" className="btn btn-primary">
              Moje analýzy
            </Link>
          ) : (
            <>
              <Link href="/prihlaseni" className="btn btn-ghost">
                Přihlásit se
              </Link>
              <Link href="/registrace" className="btn btn-primary">
                Založit účet
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const operator = process.env.OPERATOR_NAME ?? "";
  const ico = process.env.OPERATOR_ICO ?? "";
  const email = process.env.OPERATOR_EMAIL ?? "";
  return (
    <footer className="mt-16 border-t border-line bg-sheet">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-soft md:grid-cols-3">
        <div>
          <p className="type-wide font-semibold text-ink">ARONLINE</p>
          <p className="mt-1 max-w-xs">Analýza rizika ochrany před bleskem pro projektanty elektro a LPS.</p>
          {operator && (
            <p className="mt-3">
              Provozovatel: {operator}
              {ico && <>, IČO {ico}</>}
              {email && (
                <>
                  <br />
                  <a className="link" href={`mailto:${email}`}>
                    {email}
                  </a>
                </>
              )}
            </p>
          )}
        </div>
        <nav className="flex flex-col gap-1.5" aria-label="Informace">
          <Link className="link" href="/cenik">
            Ceník a podmínky tarifů
          </Link>
          <Link className="link" href="/metodika">
            Metodika a stav ověření výpočtu
          </Link>
          <Link className="link" href="/pravni/obchodni-podminky">
            Obchodní podmínky
          </Link>
          <Link className="link" href="/pravni/ochrana-osobnich-udaju">
            Ochrana osobních údajů
          </Link>
          <Link className="link" href="/pravni/reklamace">
            Reklamace a řešení chyb
          </Link>
        </nav>
        <div>
          <p className="font-semibold text-ink">Související služby</p>
          <p className="mt-1">
            Kompletní projektovou dokumentaci fotovoltaické elektrárny (FVE) nebo ochrany před bleskem (LPS) zpracuje{" "}
            <a className="link" href="https://fvsol.cz" rel="noopener">
              fvsol.cz
            </a>
            .
          </p>
          <p className="mt-4 text-xs text-muted">Mapové podklady a geodata © ČÚZK (CC BY 4.0).</p>
        </div>
      </div>
    </footer>
  );
}
