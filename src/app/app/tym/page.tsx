import { TeamPanel } from "@/components/team";

export const metadata = { title: "Tým" };

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl">Tým a pracovní prostory</h1>
      <TeamPanel />
    </div>
  );
}
