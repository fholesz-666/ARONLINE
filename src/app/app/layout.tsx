import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { AppNav, LogoutButton, VerifyEmailBanner, WorkspaceSwitcher } from "@/components/app-chrome";
import { getCurrent } from "@/server/auth/session";
import { listWorkspaces } from "@/server/services/workspace";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const c = await getCurrent();
  if (!c) redirect("/prihlaseni?next=/app");
  const workspaces = await listWorkspaces(c.user.id);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-sheet">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-5">
            <Brand href="/app" />
            <AppNav isAdmin={c.user.role === "ADMIN"} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <WorkspaceSwitcher workspaces={workspaces} current={c.workspaceId} />
            <span className="hidden text-muted md:inline">{c.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      {!c.user.emailVerified && <VerifyEmailBanner />}
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-sheet">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-4 text-xs text-muted">
          <span>Geodata © ČÚZK (CC BY 4.0)</span>
          <span>
            <Link className="link" href="/metodika">
              Metodika
            </Link>{" "}
            ·{" "}
            <Link className="link" href="/pravni/obchodni-podminky">
              Obchodní podmínky
            </Link>{" "}
            ·{" "}
            <a className="link" href="https://fvsol.cz" rel="noopener">
              Projekce FVE a LPS – fvsol.cz
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
