/** Formátování čísel pro stopu výpočtu a dokumenty (česká desetinná čárka). */

const SUP: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

function sup(n: number): string {
  return String(n)
    .split("")
    .map((c) => SUP[c] ?? c)
    .join("");
}

function trimZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Formátuje číslo: malá a velká čísla ve tvaru 1,23·10⁻⁵, ostatní běžně.
 * @param digits počet platných číslic
 */
export function fmtNum(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 0.01 && abs < 1e5) {
    // běžný zápis s omezeným počtem platných číslic
    const decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(abs)));
    const s = trimZeros(value.toFixed(Math.min(decimals, 10)));
    return withThousands(s).replace(".", ",");
  }
  const exp = Math.floor(Math.log10(abs));
  let mant = value / Math.pow(10, exp);
  let e = exp;
  // zaokrouhlení může dát 10,0
  let ms = trimZeros(mant.toFixed(digits - 1));
  if (Math.abs(parseFloat(ms)) >= 10) {
    mant = mant / 10;
    e += 1;
    ms = trimZeros(mant.toFixed(digits - 1));
  }
  if (ms === "1") return "10" + sup(e);
  if (ms === "-1") return "−10" + sup(e);
  return ms.replace(".", ",").replace("-", "−") + "·10" + sup(e);
}

function withThousands(s: string): string {
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [int, dec] = body.split(".");
  const grouped = int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : int;
  return (neg ? "−" : "") + grouped + (dec != null ? "." + dec : "");
}

/** Čísla v exponentovém tvaru vhodném pro tabulky výsledků (vždy ·10ⁿ pro rizika). */
export function fmtRisk(value: number): string {
  if (value === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(value)));
  let mant = value / Math.pow(10, exp);
  let e = exp;
  let ms = mant.toFixed(2);
  if (Math.abs(parseFloat(ms)) >= 10) {
    mant = mant / 10;
    e += 1;
    ms = mant.toFixed(2);
  }
  return ms.replace(".", ",") + "·10" + sup(e);
}
