import { VvFooter, VvHeader } from "@/components/vv/chrome";

export default function VvLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="vv-theme">
      <VvHeader />
      <main>{children}</main>
      <VvFooter />
    </div>
  );
}
