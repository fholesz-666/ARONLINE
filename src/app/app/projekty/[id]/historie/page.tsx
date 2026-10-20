import { HistoryPanel } from "@/components/history";

export const metadata = { title: "Historie projektu" };

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl">Historie změn</h1>
      <HistoryPanel projectId={id} />
    </div>
  );
}
