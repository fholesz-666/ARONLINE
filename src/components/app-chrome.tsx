"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

const NAV = [
  { href: "/app", label: "Analýzy", exact: true },
  { href: "/app/profil", label: "Profil a razítko" },
  { href: "/app/predplatne", label: "Předplatné a kredity" },
  { href: "/app/sablony", label: "Šablony" },
  { href: "/app/tym", label: "Tým" },
];

/** Položky, které host nevidí (vyžadují registraci). */
const REGISTERED_ONLY = new Set(["/app/predplatne", "/app/sablony", "/app/tym"]);

export function AppNav({ isAdmin, isGuest = false }: { isAdmin: boolean; isGuest?: boolean }) {
  const path = usePathname();
  const base = isGuest ? NAV.filter((i) => !REGISTERED_ONLY.has(i.href)) : NAV;
  const items = isAdmin ? [...base, { href: "/app/admin", label: "Správa" }] : base;
  return (
    <nav className="flex flex-wrap gap-0.5 text-sm" aria-label="Aplikace">
      {items.map((i) => {
        const active = "exact" in i && i.exact ? path === i.href || path.startsWith("/app/projekty") : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-sm px-2.5 py-1.5 no-underline ${active ? "bg-ink text-white" : "text-ink-soft hover:bg-line-soft hover:text-ink"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost px-2 py-1 text-sm"
      onClick={async () => {
        await api("/api/auth/logout", { body: {} }).catch(() => null);
        router.push("/");
        router.refresh();
      }}
    >
      Odhlásit
    </button>
  );
}

export function WorkspaceSwitcher({
  workspaces,
  current,
}: {
  workspaces: { workspaceId: string; workspaceName: string; workspaceType: string }[];
  current: string | null;
}) {
  const router = useRouter();
  if (workspaces.length < 2) return null;
  return (
    <select
      className="input w-auto py-1 text-sm"
      aria-label="Pracovní prostor"
      value={current ?? ""}
      onChange={async (e) => {
        await api("/api/workspaces/switch", { body: { workspaceId: e.target.value } });
        router.push("/app");
        router.refresh();
      }}
    >
      {workspaces.map((w) => (
        <option key={w.workspaceId} value={w.workspaceId}>
          {w.workspaceType === "PERSONAL" ? `Osobní – ${w.workspaceName}` : w.workspaceName}
        </option>
      ))}
    </select>
  );
}

export function VerifyEmailBanner() {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  return (
    <div className="border-b border-signal bg-signal-soft">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <span>Potvrďte prosím svůj e-mail – bez ověření nelze provést platbu.</span>
        {state === "sent" ? (
          <span className="font-semibold">Odkaz jsme poslali znovu.</span>
        ) : (
          <button
            className="btn btn-secondary px-2.5 py-1 text-sm"
            onClick={async () => {
              try {
                await api("/api/auth/resend", { body: {} });
                setState("sent");
              } catch (e) {
                setState("error");
                setMsg(e instanceof ApiError ? e.message : "Odeslání se nezdařilo");
              }
            }}
          >
            Poslat odkaz znovu
          </button>
        )}
        {state === "error" && <span className="text-bad">{msg}</span>}
      </div>
    </div>
  );
}
