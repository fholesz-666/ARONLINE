"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Notice, SelectInput, Spinner, TextInput } from "./ui";

interface Data {
  workspaces: { workspaceId: string; workspaceName: string; workspaceType: string; role: string }[];
  current: { workspaceId: string; workspaceName: string; workspaceType: string; role: string } | null;
  members: { userId: string; name: string; email: string; role: string }[];
}

const ROLE: Record<string, string> = { OWNER: "vlastník", ADMIN: "správce", MEMBER: "člen" };

export function TeamPanel() {
  const router = useRouter();
  const [d, setD] = useState<Data | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const load = () => api<Data>("/api/workspaces").then(setD);
  useEffect(() => {
    load().catch(() => setMsg({ tone: "error", text: "Údaje se nepodařilo načíst." }));
  }, []);
  if (!d) return <div className="mt-6"><Spinner /></div>;
  const canManage = d.current && d.current.workspaceType === "COMPANY" && (d.current.role === "OWNER" || d.current.role === "ADMIN");

  return (
    <div className="mt-6 space-y-8">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <section className="panel p-5">
        <h2 className="text-lg">Aktuální prostor: {d.current?.workspaceName}</h2>
        <p className="text-sm text-ink-soft">
          {d.current?.workspaceType === "COMPANY" ? "Firemní prostor – projekty, šablony a kredity sdílí všichni členové." : "Osobní prostor – projekty vidíte jen vy."}
        </p>
        <ul className="mt-4 divide-y divide-line-soft text-sm">
          {d.members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between py-2">
              <span>
                {m.name} <span className="text-muted">{m.email}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-ink-soft">{ROLE[m.role]}</span>
                {canManage && m.role !== "OWNER" && (
                  <button
                    className="btn btn-ghost px-2 py-1 text-sm text-bad"
                    onClick={async () => {
                      if (!window.confirm(`Odebrat ${m.name} z týmu?`)) return;
                      await api(`/api/workspaces/members/${m.userId}`, { method: "DELETE" });
                      await load();
                    }}
                  >
                    Odebrat
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {canManage && (
          <form
            className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              setMsg(null);
              try {
                await api("/api/workspaces/invite", { body: { email, role } });
                setMsg({ tone: "ok", text: `Pozvánka odeslána na ${email}.` });
                setEmail("");
              } catch (err) {
                setMsg({ tone: "error", text: err instanceof ApiError ? err.message : "Pozvánku se nepodařilo odeslat." });
              }
            }}
          >
            <TextInput label="Pozvat kolegu (e-mail)" type="email" value={email} onChange={setEmail} />
            <SelectInput
              label="Role"
              value={role}
              onChange={setRole}
              options={[
                { value: "MEMBER", label: "člen" },
                { value: "ADMIN", label: "správce" },
              ]}
            />
            <button className="btn btn-primary">Pozvat</button>
          </form>
        )}
        {d.current?.workspaceType === "COMPANY" && !canManage && <p className="mt-3 text-sm text-muted">Členy může zvát vlastník nebo správce prostoru.</p>}
      </section>

      <section className="panel p-5">
        <h2 className="text-lg">Založit firemní prostor</h2>
        <p className="text-sm text-ink-soft">
          Firemní prostor sdílí projekty, šablony, kredity a předplatné mezi kolegy. Počet členů je dán tarifem (firemní předplatné).
        </p>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("/api/workspaces", { body: { name } });
              router.refresh();
              await load();
              setName("");
              setMsg({ tone: "ok", text: "Firemní prostor je založený a přepnutý." });
            } catch (err) {
              setMsg({ tone: "error", text: err instanceof ApiError ? err.message : "Založení se nezdařilo." });
            }
          }}
        >
          <div className="min-w-64 flex-1">
            <TextInput label="Název firmy" value={name} onChange={setName} />
          </div>
          <button className="btn btn-secondary">Založit</button>
        </form>
      </section>
    </div>
  );
}
