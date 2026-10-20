import Link from "next/link";
import { OPERATOR } from "@/config/operator";
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
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 text-xs">
          <span>Projekce hromosvodů (LPS) a fotovoltaických elektráren na klíč – DSP, DPS, analýza rizika, přepěťové ochrany.</span>
          <a className="font-semibold text-white underline underline-offset-2" href="https://fvsol.cz/?utm_source=aronline&utm_medium=web&utm_campaign=lista" rel="noopener">
            Poptat na fvsol.cz →
          </a>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Brand />
        <nav className="flex items-center gap-1 text-[0.9375rem]" aria-label="Hlavní navigace">
          <Link href="/cenik" className="btn btn-ghost hidden sm:inline-flex">
            Ceník
          </Link>
          <Link href="/metodika" className="btn btn-ghost hidden sm:inline-flex">
            Metodika
          </Link>
          <a href="https://fvsol.cz/?utm_source=aronline&utm_medium=web&utm_campaign=menu" rel="noopener" className="btn btn-ghost hidden md:inline-flex">
            Projekce FVE a LPS
          </a>
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
  const operator = OPERATOR.name;
  const ico = OPERATOR.ico;
  const email = OPERATOR.email;
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
