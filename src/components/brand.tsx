import Link from "next/link";

/** Značka: blesk vepsaný do rohu razítka. */
export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" fill="#14213d" />
      <path d="M1 22 H31" stroke="#c9d3de" strokeWidth="1" />
      <path d="M12 22 V31" stroke="#c9d3de" strokeWidth="1" />
      <path d="M18.5 4 L10 17 H15.5 L13 28 L22.5 13.5 H17 L18.5 4 Z" fill="#f2b705" />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 no-underline" aria-label="ARONLINE – úvod">
      <BrandMark />
      <span className="type-wide text-[1.05rem] font-bold tracking-wide text-ink">ARONLINE</span>
    </Link>
  );
}
