import type { Metadata } from "next";
import { VvWizard } from "@/components/vv/wizard";

export const metadata: Metadata = {
  title: { absolute: "Vyplnit protokol o určení vnějších vlivů | VV online" },
  description: "Formulář protokolu o určení vnějších vlivů podle ČSN 33 2000-5-51 ed. 3 – objekt, komise, prostory a potvrzení.",
  robots: { index: false, follow: true },
};

export default function VvNewPage() {
  return <VvWizard />;
}
