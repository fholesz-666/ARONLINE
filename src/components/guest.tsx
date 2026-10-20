"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, fieldErrors } from "@/lib/api";
import { Checkbox, Notice, TextInput } from "./ui";

/** Tlačítko „Pokračovat jako host“ – jednorázová analýza bez registrace. */
export function GuestStart({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className={compact ? "space-y-3" : "panel space-y-3 p-6"}>
      {!compact && <h2 className="text-lg">Jen jedna analýza? Bez registrace</h2>}
      <p className="text-sm text-ink-soft">
        Pokračujte jako host, vyplňte analýzu a zaplaťte jen ji ({"149 Kč"}). Balíčky a předplatné vyžadují registraci. Účet si můžete
        dokončit kdykoli později – rozpracovaná analýza zůstane zachována.
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      <Checkbox
        checked={accept}
        onChange={setAccept}
        label={
          <>
            Souhlasím s{" "}
            <Link className="link" href="/pravni/obchodni-podminky" target="_blank">
              obchodními podmínkami
            </Link>{" "}
            a beru na vědomí{" "}
            <Link className="link" href="/pravni/ochrana-osobnich-udaju" target="_blank">
              zásady ochrany osobních údajů
            </Link>
            .
          </>
        }
      />
      <button
        className="btn btn-secondary w-full"
        disabled={busy || !accept}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await api("/api/auth/guest", { body: { acceptTerms: true } });
            router.push("/app");
            router.refresh();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : "Nepodařilo se pokračovat jako host.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Připravuji…" : "Pokračovat jako host"}
      </button>
    </div>
  );
}

export function GuestBanner() {
  return (
    <div className="border-b border-signal bg-signal-soft">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <span>
          Pracujete jako <strong>host</strong>. Analýza je vázaná na tento prohlížeč – po zaplacení si dokumenty uložte, nebo si dokončete
          účet.
        </span>
        <Link className="btn btn-secondary px-2.5 py-1 text-sm" href="/app/profil#ucet">
          Dokončit registraci
        </Link>
      </div>
    </div>
  );
}

/** Dokončení registrace hosta – zachová projekty i zakoupené analýzy. */
export function UpgradeGuestForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  return (
    <form
      id="ucet"
      className="panel space-y-4 p-6"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setErrors({});
        try {
          await api("/api/auth/upgrade", { body: { name, email, password } });
          router.refresh();
        } catch (err) {
          setErrors(fieldErrors(err));
          setError(err instanceof ApiError ? err.message : "Registraci se nepodařilo dokončit.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-xl">Dokončit registraci</h2>
      <p className="text-sm text-ink-soft">
        Získáte přístup z jakéhokoli zařízení, uložený profil zpracovatele, balíčky analýz a předplatné. Vaše analýzy i zaplacené
        dokumenty zůstanou zachovány.
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      <TextInput label="Jméno a příjmení" autoComplete="name" value={name} onChange={setName} error={errors.name} />
      <TextInput label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
      <TextInput
        label="Heslo"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        help="Alespoň 10 znaků, kombinace písmen a číslic nebo symbolů."
      />
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Ukládám…" : "Vytvořit účet"}
      </button>
    </form>
  );
}
