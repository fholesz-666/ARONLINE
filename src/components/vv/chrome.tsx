import Link from "next/link";

/** Značka VV online: štít s kapkou a bleskem v tyrkysové. */
export function VvMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#0f766e" />
      <path d="M11 9.5c0 0-4 4.6-4 7.2a4 4 0 0 0 8 0c0-2.6-4-7.2-4-7.2Z" fill="#ccfbf1" />
      <path d="M21.5 6 L16.5 16 H20 L18.5 26 L25 13.5 H21.5 L23 6 Z" fill="#fde68a" />
    </svg>
  );
}

export function VvHeader() {
  return (
    <header className="border-b border-[var(--vv-line)] bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/vnejsi-vlivy" className="flex items-center gap-2.5 no-underline" aria-label="VV online – úvod">
          <VvMark />
          <span className="leading-tight">
            <span className="block text-[1.05rem] font-bold text-[var(--vv-accent-strong)]">VV online</span>
            <span className="block text-xs text-muted">Protokol o určení vnějších vlivů</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="Navigace VV online">
          <Link href="/vnejsi-vlivy#jak-to-funguje" className="vv-btn vv-btn-ghost hidden sm:inline-flex">
            Jak to funguje
          </Link>
          <Link href="/" className="vv-btn vv-btn-ghost hidden md:inline-flex">
            Analýza rizika LPS
          </Link>
          <Link href="/vnejsi-vlivy/novy" className="vv-btn vv-btn-primary">
            Vyplnit protokol
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function VvFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--vv-line)] bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-soft md:grid-cols-3">
        <div>
          <p className="font-bold text-[var(--vv-accent-strong)]">VV online</p>
          <p className="mt-1 max-w-xs">
            Formulář pro komisi, která určuje vnější vlivy podle ČSN 33 2000-5-51 ed. 3. Provozuje{" "}
            <Link className="vv-link" href="/">
              ARONLINE
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Link className="vv-link" href="/">
            Analýza rizika ochrany před bleskem (ČSN EN 62305-2)
          </Link>
          <a className="vv-link" href="https://fvsol.cz/?utm_source=aronline&utm_medium=vv&utm_campaign=paticka" rel="noopener">
            Projekce FVE a hromosvodů – fvsol.cz
          </a>
          <Link className="vv-link" href="/kontakty">
            Kontakty
          </Link>
        </div>
        <div className="flex flex-col gap-1.5">
          <Link className="vv-link" href="/pravni/obchodni-podminky">
            Obchodní podmínky
          </Link>
          <Link className="vv-link" href="/pravni/ochrana-osobnich-udaju">
            Ochrana osobních údajů
          </Link>
          <p className="mt-2 text-xs text-muted">Vnější vlivy určuje komise. Služba poskytuje formulář a vzhled protokolu.</p>
        </div>
      </div>
    </footer>
  );
}
