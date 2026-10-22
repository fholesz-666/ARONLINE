import Link from "next/link";
import { getCurrent } from "@/server/auth/session";
import { getSettings } from "@/server/services/settings";
import { Brand } from "./brand";

export async function SiteHeader() {
  let loggedIn = false;
  try {
    loggedIn = (await getCurrent()) != null;
  } catch {
    loggedIn = false;
  }
  const { texts } = await getSettings();
  return (
    <header className="border-b border-line bg-sheet">
      {texts.announcement && (
        <div className="border-b border-signal bg-signal-soft">
          <p className="mx-auto max-w-6xl px-4 py-2 text-sm">{texts.announcement}</p>
        </div>
      )}
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 text-xs">
          <span>{texts.topBar}</span>
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

export async function SiteFooter() {
  const { operator, texts } = await getSettings();
  return (
    <footer className="mt-16 border-t border-line bg-sheet">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-soft md:grid-cols-4">
        <div>
          <p className="type-wide font-semibold text-ink">ARONLINE</p>
          <p className="mt-1 max-w-xs">{texts.footerAbout}</p>
          <p className="mt-3">
            Provozovatel: {operator.name}
            {operator.ico && <>, IČO {operator.ico}</>}
            {operator.address && (
              <>
                <br />
                {operator.address}
              </>
            )}
            <br />
            <a className="link" href={`mailto:${operator.email}`}>
              {operator.email}
            </a>
            {operator.phone && (
              <>
                <br />
                <a className="link" href={`tel:${operator.phone.replace(/\s+/g, "")}`}>
                  {operator.phone}
                </a>
              </>
            )}
          </p>
        </div>
        <nav className="flex flex-col gap-1.5" aria-label="Informace">
          <Link className="link" href="/cenik">
            Ceník a podmínky tarifů
          </Link>
          <Link className="link" href="/metodika">
            Metodika a stav ověření výpočtu
          </Link>
          <Link className="link" href="/kontakty">
            Kontakty
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
        <nav className="flex flex-col gap-1.5" aria-label="Průvodce">
          <Link className="link" href="/analyza-rizika-lps">
            Co je analýza rizika LPS
          </Link>
          <Link className="link" href="/analyza-rizika-fve">
            Analýza rizika u fotovoltaiky
          </Link>
          <Link className="link" href="/casto-kladene-otazky">
            Časté otázky
          </Link>
          <Link className="link" href="/o-aplikaci">
            O aplikaci
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
          <PaymentMethods />
          <p className="mt-4 text-xs text-muted">Mapové podklady a geodata © ČÚZK (CC BY 4.0).</p>
        </div>
      </div>
    </footer>
  );
}

/** Přijímané platební metody (náležitost prodejního místa podle GoPay). */
export function PaymentMethods() {
  const badge = "rounded-sm border border-line bg-paper px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-ink";
  return (
    <div className="mt-4">
      <p className="text-xs text-muted">Platby kartou zabezpečuje GoPay</p>
      <div className="mt-1 flex flex-wrap gap-1" aria-label="Přijímané platební metody">
        <span className={badge}>VISA</span>
        <span className={badge}>Mastercard</span>
        <span className={badge}>3-D Secure</span>
        <span className={badge}>GoPay</span>
        <span className={badge}>převod / QR platba</span>
      </div>
    </div>
  );
}
