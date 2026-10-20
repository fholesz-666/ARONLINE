import { TemplatesPanel } from "@/components/templates";

export const metadata = { title: "Šablony" };

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl">Šablony vedení, zón a zařízení</h1>
      <p className="mt-2 max-w-[70ch] text-ink-soft">
        Často používané konfigurace uložíte v průvodci analýzou tlačítkem „Uložit jako šablonu“. Tady je můžete procházet a mazat.
      </p>
      <TemplatesPanel />
    </div>
  );
}
