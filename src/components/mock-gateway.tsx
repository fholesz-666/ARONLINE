"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Notice } from "./ui";

export function MockGatewayActions({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function act(action: "PAID" | "CANCELED") {
    setBusy(true);
    setError(null);
    try {
      await api("/api/payments/mock", { body: { id, action } });
      window.location.href = `/platba/navrat?id=${id}`;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Akce selhala.");
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={busy} onClick={() => act("PAID")}>
          Zaplatit (simulace)
        </button>
        <button className="btn btn-secondary" disabled={busy} onClick={() => act("CANCELED")}>
          Zrušit platbu
        </button>
      </div>
    </div>
  );
}
