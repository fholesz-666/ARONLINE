"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Notice } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

function Accept() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/workspaces/accept", { body: { token } });
      router.push("/app");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/prihlaseni?next=${encodeURIComponent(`/pozvanka?token=${token}`)}`);
        return;
      }
      setError(e instanceof ApiError ? e.message : "Pozvánku se nepodařilo přijmout.");
      setBusy(false);
    }
  }
  return (
    <div className="panel space-y-4 p-6">
      <h1 className="text-2xl">Pozvánka do týmu</h1>
      <p className="text-ink-soft">Po přijetí uvidíte projekty a šablony týmu. Pokud ještě nemáte účet, nejprve se zaregistrujte se stejným e-mailem, na který přišla pozvánka.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <button className="btn btn-primary w-full" onClick={accept} disabled={busy || !token}>
        Přijmout pozvánku
      </button>
      <Link href="/registrace" className="link text-sm">
        Založit účet
      </Link>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense>
      <Accept />
    </Suspense>
  );
}
