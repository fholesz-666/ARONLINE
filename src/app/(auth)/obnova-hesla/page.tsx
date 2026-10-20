"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Notice, TextInput } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/reset", { body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nastavení hesla se nezdařilo.");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="panel space-y-4 p-6">
        <Notice tone="ok">Heslo je změněné. Ze všech zařízení jsme vás odhlásili.</Notice>
        <Link className="btn btn-primary w-full" href="/prihlaseni">
          Přihlásit se
        </Link>
      </div>
    );
  return (
    <form onSubmit={submit} className="panel space-y-4 p-6">
      <h1 className="text-2xl">Nové heslo</h1>
      {!token && <Notice tone="error">Odkaz je neúplný. Otevřete ho prosím znovu z e-mailu.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <TextInput
        label="Nové heslo"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        help="Alespoň 10 znaků, kombinace písmen a číslic nebo symbolů."
      />
      <button className="btn btn-primary w-full" disabled={busy || !token}>
        Nastavit heslo
      </button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
