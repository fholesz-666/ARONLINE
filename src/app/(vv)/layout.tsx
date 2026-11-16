import type { Metadata } from "next";
import { VvAccountLink } from "@/components/vv/account-link";
import { VvFooter, VvHeader } from "@/components/vv/chrome";

export const metadata: Metadata = {
  // název a ikona (apple-icon.png v /vnejsi-vlivy) při „Přidat na plochu“
  appleWebApp: { title: "Vnější vlivy" },
};

export default function VvLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="vv-theme">
      <VvHeader account={<VvAccountLink />} />
      <main>{children}</main>
      <VvFooter />
    </div>
  );
}
