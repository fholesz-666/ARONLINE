import { BillingPanel } from "@/components/billing";

export const metadata = { title: "Předplatné a kredity" };

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl">Předplatné a kredity</h1>
      <BillingPanel />
    </div>
  );
}
