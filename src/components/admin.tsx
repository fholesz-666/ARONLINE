"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Checkbox, Notice, NumberInput, Spinner, TextInput } from "./ui";

interface Product {
  code: string;
  name: string;
  description: string;
  type: string;
  priceHaler: number;
  credits: number | null;
  unlocksPerPeriod: number | null;
  maxMembers: number;
  active: boolean;
}

export function AdminProducts() {
  const [list, setList] = useState<Product[] | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const load = () => api<{ products: Product[] }>("/api/admin/products").then((r) => setList(r.products));
  useEffect(() => {
    load().catch(() => setMsg({ tone: "error", text: "Ceník se nepodařilo načíst." }));
  }, []);
  if (!list) return <Spinner />;
  return (
    <div className="mt-4 space-y-4">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {list.map((p, i) => (
        <form
          key={p.code}
          className="panel grid gap-3 p-4 sm:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("/api/admin/products", {
                method: "PUT",
                body: {
                  code: p.code,
                  name: p.name,
                  description: p.description,
                  priceCzk: Math.round(p.priceHaler / 100),
                  credits: p.credits,
                  unlocksPerPeriod: p.unlocksPerPeriod,
                  maxMembers: p.maxMembers,
                  active: p.active,
                },
              });
              setMsg({ tone: "ok", text: `Produkt ${p.name} uložen.` });
            } catch (err) {
              setMsg({ tone: "error", text: err instanceof ApiError ? err.message : "Uložení se nezdařilo." });
            }
          }}
        >
          <TextInput label={`Název (${p.code})`} value={p.name} onChange={(v) => setList(list.map((x, j) => (j === i ? { ...x, name: v } : x)))} />
          <NumberInput label="Cena" unit="Kč" value={p.priceHaler / 100} onChange={(v) => setList(list.map((x, j) => (j === i ? { ...x, priceHaler: Math.round((v ?? 0) * 100) } : x)))} />
          {p.type === "ONE_TIME" ? (
            <NumberInput label="Kreditů" value={p.credits} onChange={(v) => setList(list.map((x, j) => (j === i ? { ...x, credits: v } : x)))} />
          ) : (
            <NumberInput
              label="Analýz za měsíc (prázdné = neomezeně)"
              value={p.unlocksPerPeriod}
              onChange={(v) => setList(list.map((x, j) => (j === i ? { ...x, unlocksPerPeriod: v } : x)))}
            />
          )}
          <div className="sm:col-span-2">
            <TextInput label="Popis" value={p.description} onChange={(v) => setList(list.map((x, j) => (j === i ? { ...x, description: v } : x)))} />
          </div>
          <NumberInput label="Max. členů" value={p.maxMembers} onChange={(v) => setList(list.map((x, j) => (j === i ? { ...x, maxMembers: v ?? 1 } : x)))} />
          <Checkbox label="Aktivní (v nabídce)" checked={p.active} onChange={(v) => setList(list.map((x, j) => (j === i ? { ...x, active: v } : x)))} />
          <div className="sm:col-span-2 sm:text-right">
            <button className="btn btn-primary">Uložit</button>
          </div>
        </form>
      ))}
    </div>
  );
}
