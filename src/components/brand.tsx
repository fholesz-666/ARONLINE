import Link from "next/link";

/** Značka ARONLINE (varianta AR-2): široké „AR“ s bleskem na bezpečnostní žluté. */
export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 180" className={className} aria-hidden="true" style={{ borderRadius: "18%" }}>
      <rect width="180" height="180" fill="#f2b705" />
      <path fill="#14213d" fillRule="evenodd" d="M16 130 L44 58 H68 L96 130 H73 L68 116 H44 L39 130 Z M50 100 H62 L56 81 Z" />
      <path
        fill="#14213d"
        fillRule="evenodd"
        d="M100 58 H138 C154 58 164 67 164 81 C164 91 158 98 149 101 L166 130 H141 L127 104 H122 V130 H100 Z M122 75 V88 H136 C141 88 143 85 143 81.5 C143 77.5 141 75 136 75 Z"
      />
      <path d="M104 22 L78 84 H95 L85 140 L120 72 H102 L113 22 Z" fill="#f2b705" stroke="#14213d" strokeWidth="6" strokeLinejoin="round" />
      <rect x="16" y="146" width="150" height="9" fill="#14213d" />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 no-underline" aria-label="ARONLINE – úvod">
      <BrandMark className="h-9 w-9" />
      <span className="type-wide text-[1.05rem] font-bold tracking-wide text-ink">ARONLINE</span>
    </Link>
  );
}
