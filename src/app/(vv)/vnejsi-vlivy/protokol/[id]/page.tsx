import type { Metadata } from "next";
import { VV_PRODUCT_CODE } from "@/config/pricing";
import { VvProtocolView } from "@/components/vv/protocol-view";
import { getProduct } from "@/server/services/billing";

export const metadata: Metadata = {
  title: { absolute: "Protokol o určení vnějších vlivů | VV online" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function VvProtocolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let price = 99;
  try {
    const p = await getProduct(VV_PRODUCT_CODE);
    if (p?.active) price = p.priceHaler / 100;
  } catch {
    /* výchozí cena */
  }
  return <VvProtocolView id={id} price={price} />;
}
