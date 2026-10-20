import Link from "next/link";
import { redirect } from "next/navigation";
import { NewProjectForm, ProjectRowActions } from "@/components/dashboard";
import { BUILDING_TYPES } from "@/catalog";
import { requireMember } from "@/server/auth/session";
import { HttpError } from "@/server/http";
import { activeSubscription, creditBalance } from "@/server/services/billing";
import { listProjects } from "@/server/services/projects";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { DRAFT: "Rozpracováno", CALCULATED: "Spočítáno", ARCHIVED: "Archiv" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ filtr?: string }> }) {
  let c;
  try {
    c = await requireMember();
  } catch (e) {
    if (e instanceof HttpError) redirect("/prihlaseni?next=/app");
    throw e;
  }
  const { filtr } = await searchParams;
  const [projects, balance, sub] = await Promise.all([listProjects(c.workspaceId), creditBalance(c.workspaceId), activeSubscription(c.workspaceId)]);
  const shown = projects.filter((p) => (filtr === "hotove" ? p.unlockedAt != null : filtr === "rozpracovane" ? p.unlockedAt == null : true));
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-2xl">Analýzy</h1>
            <nav className="flex gap-1 text-sm" aria-label="Filtr">
              {[
                ["", "Všechny"],
                ["rozpracovane", "Rozpracované"],
                ["hotove", "Odemčené"],
              ].map(([k, l]) => (
                <Link
                  key={k}
                  href={k ? `/app?filtr=${k}` : "/app"}
                  className={`rounded-sm px-2.5 py-1 no-underline ${(filtr ?? "") === k ? "bg-ink text-white" : "text-ink-soft hover:bg-line-soft"}`}
                >
                  {l}
                </Link>
              ))}
            </nav>
          </div>
          {shown.length === 0 ? (
            <div className="panel mt-5 p-8 text-center">
              <p className="text-lg">Zatím tu nejsou žádné analýzy.</p>
              <p className="mt-1 text-ink-soft">Založte první analýzu vpravo – stačí název a druh objektu.</p>
            </div>
          ) : (
            <div className="panel mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-soft">
                    <th className="px-4 py-2.5 font-semibold">Projekt</th>
                    <th className="px-4 py-2.5 font-semibold">Stav</th>
                    <th className="px-4 py-2.5 font-semibold">Upraveno</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p.id} className="border-b border-line-soft last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/app/projekty/${p.id}`} className="font-semibold text-ink no-underline hover:underline">
                          {p.name}
                        </Link>
                        {p.jobNumber && <span className="ml-2 text-muted">{p.jobNumber}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {p.unlockedAt ? (
                          <span className="rounded-sm bg-ok-soft px-1.5 py-0.5 text-xs font-semibold text-ok">Odemčeno</span>
                        ) : (
                          <span className="text-ink-soft">{STATUS[p.status]}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{new Date(p.updatedAt).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="px-4 py-3 text-right">
                        <ProjectRowActions id={p.id} name={p.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <aside className="space-y-5">
          <NewProjectForm types={BUILDING_TYPES.map((b) => ({ key: b.key, label: b.label, group: b.group }))} />
          <div className="panel p-4 text-sm">
            <p className="font-semibold">Kredity a předplatné</p>
            <p className="mt-2">
              Zůstatek kreditů: <strong>{balance}</strong>
            </p>
            {sub ? (
              <p className="mt-1">
                {sub.product.name} do {sub.subscription.currentPeriodEnd?.toLocaleDateString("cs-CZ")}
              </p>
            ) : (
              <p className="mt-1 text-ink-soft">Bez předplatného</p>
            )}
            <Link href="/app/predplatne" className="link mt-2 inline-block">
              Koupit analýzy
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
