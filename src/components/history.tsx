"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Notice, Spinner } from "./ui";

interface Rev {
  id: string;
  version: number;
  note: string | null;
  createdAt: string;
}

export function HistoryPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [revs, setRevs] = useState<Rev[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    api<{ revisions: Rev[] }>(`/api/projects/${projectId}/revisions`)
      .then((r) => setRevs(r.revisions))
      .catch((e) => setMsg(e instanceof ApiError ? e.message : "Historii se nepodařilo načíst."));
  }, [projectId]);
  if (msg) return <Notice tone="error">{msg}</Notice>;
  if (!revs) return <Spinner />;
  return (
    <div className="mt-6">
      <Link className="link text-sm" href={`/app/projekty/${projectId}`}>
        Zpět na projekt
      </Link>
      {revs.length === 0 ? (
        <p className="mt-4 text-ink-soft">Zatím nejsou uložené žádné verze.</p>
      ) : (
        <ul className="panel mt-4 divide-y divide-line-soft">
          {revs.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>
                {new Date(r.createdAt).toLocaleString("cs-CZ")} – {r.note ?? "Uloženo"} <span className="text-muted">(verze {r.version})</span>
              </span>
              <button
                className="btn btn-ghost px-2 py-1 text-sm"
                onClick={async () => {
                  if (!window.confirm("Obnovit tuto verzi? Aktuální stav se nejprve uloží do historie.")) return;
                  try {
                    await api(`/api/projects/${projectId}/revisions/${r.id}`, { body: {} });
                    router.push(`/app/projekty/${projectId}`);
                  } catch (e) {
                    setMsg(e instanceof ApiError ? e.message : "Obnovení se nezdařilo.");
                  }
                }}
              >
                Obnovit
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
