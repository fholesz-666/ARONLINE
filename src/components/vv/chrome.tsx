import Link from "next/link";
import { BrandMark } from "@/components/brand";

/** Odkaz na FVSOL s označením zdroje (VV online). */
export function fvsolUrl(campaign: string) {
  return `https://fvsol.cz/?utm_source=aronline&utm_medium=vv&utm_campaign=${campaign}`;
}

export function FvsolLogo({ className = "h-5 w-auto" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/fvsol-logo.png" alt="FVSOL" className={className} />;
}

/** Proužek s prokliky na projekci FVSOL a analýzu rizika ARONLINE. */
export function VvPromoStrip({ campaign, aq3 = false }: { campaign: string; aq3?: boolean }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <a href={fvsolUrl(campaign)} rel="noopener" className="vv-card flex items-center gap-4 p-4 no-underline hover:border-[var(--vv-accent)]">
        <FvsolLogo className="h-6 w-auto shrink-0" />
        <span className="text-sm text-ink-soft">
          <span className="block font-semibold text-ink">Projekt FVE nebo hromosvodu?</span>
          Kompletní projektovou dokumentaci zpracuje FVSOL. <span className="vv-link font-semibold">Poptat →</span>
        </span>
      </a>
      <Link href="/" className={`vv-card flex items-center gap-4 p-4 no-underline hover:border-[var(--vv-accent)] ${aq3 ? "border-[var(--vv-accent)]" : ""}`}>
        <BrandMark className="h-10 w-10 shrink-0" />
        <span className="text-sm text-ink-soft">
          <span className="block font-semibold text-ink">{aq3 ? "Máte AQ3 – spočítejte analýzu rizika" : "Analýza rizika ochrany před bleskem"}</span>
          Podle ČSN EN 62305-2 online, i bez registrace. <span className="vv-link font-semibold">Spočítat →</span>
        </span>
      </Link>
    </div>
  );
}

/** Značka VV online (varianta VV-3): štítek „VV“ s pruhem kódu vlivu. `detailed` = s textem v pruhu (velké velikosti). */
export function VvMark({ className = "h-8 w-8", detailed = false }: { className?: string; detailed?: boolean }) {
  return (
    <svg viewBox="0 0 180 180" className={className} aria-hidden="true" style={{ borderRadius: "18%" }}>
      <rect width="180" height="180" fill="#f3faf8" />
      <rect x="18" y="18" width="144" height="144" rx="24" fill="#ffffff" stroke="#0f766e" strokeWidth="7" />
      <path fill="#0f766e" d="M34 42 H56 L63 82 L70 42 H90 L72 112 H52 Z" />
      <path fill="#0f766e" d="M90 42 H112 L119 82 L126 42 H146 L128 112 H108 Z" />
      <path d="M18 124 H162 V138 C162 151 151 162 138 162 H42 C29 162 18 151 18 138 Z" fill="#0f766e" />
      {detailed && (
        <text x="90" y="150" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fde68a" letterSpacing="1.5">
          AD4 · IP44
        </text>
      )}
    </svg>
  );
}

export function VvHeader({ account }: { account?: React.ReactNode }) {
  return (
    <header className="border-b border-[var(--vv-line)] bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/vnejsi-vlivy" className="flex items-center gap-2.5 no-underline" aria-label="VV online – úvod">
          <VvMark className="h-9 w-9" />
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
          <a href={fvsolUrl("menu")} rel="noopener" className="vv-btn vv-btn-ghost hidden lg:inline-flex">
            Projekce FVE – fvsol.cz
          </a>
          {account}
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
          <a className="vv-link" href={fvsolUrl("paticka")} rel="noopener">
            Projekce FVE a hromosvodů – fvsol.cz
          </a>
          <a href={fvsolUrl("paticka-logo")} rel="noopener" className="mt-2 inline-flex w-fit" aria-label="FVSOL – projekce FVE a hromosvodů">
            <FvsolLogo className="h-6 w-auto" />
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
