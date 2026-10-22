"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button
        className="btn btn-ghost text-sm"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("Zrušit objednávku? Pokud jste už zaplatili, nerušte ji – platbu potvrdíme po připsání.")) return;
          setBusy(true);
          try {
            await api(`/api/orders/${orderId}`, { method: "DELETE" });
            router.refresh();
          } catch (e) {
            setErr(e instanceof ApiError ? e.message : "Zrušení se nezdařilo.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Zrušit objednávku
      </button>
      {err && <p className="text-sm text-bad">{err}</p>}
    </>
  );
}
