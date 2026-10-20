"use client";

import Link from "next/link";
import { GuestStart } from "@/components/guest";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Notice, TextInput } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { body: { email, password } });
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Přihlášení se nezdařilo.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel space-y-4 p-6" noValidate>
      <h1 className="text-2xl">Přihlášení</h1>
      {error && <Notice tone="error">{error}</Notice>}
      <TextInput label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} required />
      <TextInput label="Heslo" type="password" autoComplete="current-password" value={password} onChange={setPassword} required />
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Přihlašuji…" : "Přihlásit se"}
      </button>
      <div className="flex justify-between text-sm">
        <Link className="link" href="/zapomenute-heslo">
          Zapomenuté heslo
        </Link>
        <Link className="link" href="/registrace">
          Založit účet
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <Suspense>
        <LoginForm />
      </Suspense>
      <GuestStart />
    </div>
  );
}
