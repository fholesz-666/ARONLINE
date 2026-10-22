import { AdminProducts } from "@/components/admin";

export const metadata = { title: "Správa – Ceník" };

export default function Page() {
  return (
    <section>
      <p className="max-w-[80ch] text-sm text-ink-soft">
        Změna ceny se projeví u nových objednávek. Již vytvořené objednávky si cenu pamatují. Běžící předplatné se strhává v původní výši (opakovaná platba
        u GoPay má pevnou částku) – nová cena platí jen pro nově založená předplatná. Pokud byste chtěli změnit cenu běžícím předplatným, musí být zákazník
        informován nejméně 7 pracovních dní předem (podmínky GoPay).
      </p>
      <AdminProducts />
    </section>
  );
}
