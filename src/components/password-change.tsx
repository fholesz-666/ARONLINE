"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Notice, TextInput } from "./ui";

export function PasswordChange() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        try {
          await api("/api/auth/password", { body: { currentPassword: cur, newPassword: next } });
          setMsg({ tone: "ok", text: "Heslo je změněné." });
          setCur("");
          setNext("");
        } catch (err) {
          setMsg({ tone: "error", text: err instanceof ApiError ? err.message : "Změna hesla se nezdařila." });
        }
      }}
    >
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <TextInput label="Současné heslo" type="password" autoComplete="current-password" value={cur} onChange={setCur} />
      <TextInput label="Nové heslo" type="password" autoComplete="new-password" value={next} onChange={setNext} />
      <button className="btn btn-secondary">Změnit heslo</button>
    </form>
  );
}
