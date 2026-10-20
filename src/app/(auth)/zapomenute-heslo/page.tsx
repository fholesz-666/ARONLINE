"use client";

import Link from "next/link";
import { useState } from "react";
import { Notice, TextInput } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/forgot", { body: { email } });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Odeslání se nezdařilo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel space-y-4 p-6">
      <h1 className="text-2xl">Obnovení hesla</h1>
      {sent ? (
        <Notice tone="ok">Pokud u nás účet s tímto e-mailem existuje, poslali jsme na něj odkaz pro nastavení nového hesla. Odkaz platí 1 hodinu.</Notice>
      ) : (
        <>
          {error && <Notice tone="error">{error}</Notice>}
          <TextInput label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} />
          <button className="btn btn-primary w-full" disabled={busy}>
            Poslat odkaz
          </button>
        </>
      )}
      <Link className="link text-sm" href="/prihlaseni">
        Zpět na přihlášení
      </Link>
    </form>
  );
}
