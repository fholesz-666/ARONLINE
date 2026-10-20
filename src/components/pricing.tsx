import Link from "next/link";
import { DEFAULT_PRODUCTS } from "@/config/pricing";
import { listProducts } from "@/server/services/billing";

export interface PublicProduct {
  code: string;
  name: string;
  description: string;
  type: "ONE_TIME" | "SUBSCRIPTION";
  priceCzk: number;
  features: string[];
}

/** Ceník z databáze (lze měnit v administraci); při nedostupnosti DB výchozí ceník. */
export async function getPublicProducts(): Promise<PublicProduct[]> {
  try {
    const rows = await listProducts();
    if (rows.length) {
      return rows.map((r) => ({
        code: r.code,
        name: r.name,
        description: r.description,
        type: r.type,
        priceCzk: r.priceHaler / 100,
        features: Array.isArray(r.features) ? (r.features as string[]) : [],
      }));
    }
  } catch {
    /* výchozí ceník */
  }
  return DEFAULT_PRODUCTS.map((p) => ({ ...p }));
}

export function formatCzk(v: number) {
  return `${v.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} Kč`;
}

export function PricingTable({ products, ctaHref = "/registrace" }: { products: PublicProduct[]; ctaHref?: string }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <div key={p.code} className="flex flex-col bg-sheet p-5">
          <h3 className="text-lg">{p.name}</h3>
          <p className="mt-3">
            <span className="type-wide text-3xl font-bold">{formatCzk(p.priceCzk)}</span>
            {p.type === "SUBSCRIPTION" && <span className="text-muted"> / měsíc</span>}
          </p>
          <p className="mt-2 text-sm text-ink-soft">{p.description}</p>
          <ul className="mt-4 flex-1 space-y-1.5 text-sm">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden="true" className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 bg-signal" />
                {f}
              </li>
            ))}
          </ul>
          <Link href={ctaHref} className="btn btn-secondary mt-5">
            {p.type === "SUBSCRIPTION" ? "Začít s předplatným" : "Začít analýzu"}
          </Link>
        </div>
      ))}
    </div>
  );
}
