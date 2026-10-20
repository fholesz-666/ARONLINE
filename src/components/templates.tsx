"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner } from "./ui";

interface Tpl {
  id: string;
  kind: "LINE" | "ZONE" | "INTERNAL_SYSTEM" | "PROJECT";
  name: string;
}
const KIND: Record<Tpl["kind"], string> = { LINE: "Vedení", ZONE: "Zóna", INTERNAL_SYSTEM: "Vnitřní systém", PROJECT: "Projekt" };

export function TemplatesPanel() {
  const [list, setList] = useState<Tpl[] | null>(null);
  const load = () => api<{ templates: Tpl[] }>("/api/templates").then((r) => setList(r.templates));
  useEffect(() => {
    load().catch(() => setList([]));
  }, []);
  if (!list) return <div className="mt-6"><Spinner /></div>;
  if (!list.length) return <p className="panel mt-6 p-6 text-ink-soft">Zatím nemáte žádné šablony.</p>;
  return (
    <ul className="panel mt-6 divide-y divide-line-soft">
      {list.map((t) => (
        <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
          <span>
            <span className="mr-2 rounded-sm bg-line-soft px-1.5 py-0.5 text-xs">{KIND[t.kind]}</span>
            {t.name}
          </span>
          <button
            className="btn btn-ghost px-2 py-1 text-sm text-bad"
            onClick={async () => {
              await api(`/api/templates/${t.id}`, { method: "DELETE" });
              await load();
            }}
          >
            Smazat
          </button>
        </li>
      ))}
    </ul>
  );
}
