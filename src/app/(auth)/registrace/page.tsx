"use client";

import Link from "next/link";
import { GuestStart } from "@/components/guest";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Checkbox, Notice, TextInput } from "@/components/ui";
import { api, ApiError, fieldErrors } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      await api("/api/auth/register", {
        body: { name, email, password, acceptTerms: accept },
      });
      router.push("/app/profil?vitejte=1");
      router.refresh();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(
        err instanceof ApiError ? err.message : "Registrace se nezdařila.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="panel space-y-4 p-6" noValidate>
        <h1 className="text-2xl">Založit účet</h1>
        <p className="text-sm text-ink-soft">
          Registrace je zdarma a je nutná pro balíčky analýz a předplatné.
          Platíte až za stažení dokumentace.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <TextInput
          label="Jméno a příjmení"
          autoComplete="name"
          value={name}
          onChange={setName}
          error={errors.name}
        />
        <TextInput
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />
        <TextInput
          label="Heslo"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          help="Alespoň 10 znaků, kombinace písmen a číslic nebo symbolů."
        />
        <Checkbox
          checked={accept}
          onChange={setAccept}
          label={
            <>
              Souhlasím s{" "}
              <Link
                className="link"
                href="/pravni/obchodni-podminky"
                target="_blank"
              >
                obchodními podmínkami
              </Link>{" "}
              a beru na vědomí{" "}
              <Link
                className="link"
                href="/pravni/ochrana-osobnich-udaju"
                target="_blank"
              >
                zásady ochrany osobních údajů
              </Link>
              .
            </>
          }
        />
        {errors.acceptTerms && (
          <p className="text-sm text-bad">{errors.acceptTerms}</p>
        )}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Zakládám účet…" : "Založit účet"}
        </button>
        <p className="text-sm">
          Už máte účet?{" "}
          <Link className="link" href="/prihlaseni">
            Přihlaste se
          </Link>
        </p>
      </form>
      <GuestStart />
    </div>
  );
}
