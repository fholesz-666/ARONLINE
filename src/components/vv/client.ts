"use client";

import { ApiError } from "@/lib/api";

const TOKEN_PREFIX = "vv-token:";
export const DRAFT_KEY = "vv-draft-v1";

/** Úložiště prohlížeče může být nedostupné (anonymní režim, blokace) – chyby ignorujeme. */
export function storeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function storeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* nedostupné úložiště */
  }
}
export function storeRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nedostupné úložiště */
  }
}

export const getToken = (id: string) => storeGet(TOKEN_PREFIX + id);
export const saveToken = (id: string, token: string) => storeSet(TOKEN_PREFIX + id, token);

/** Volání API protokolu s tokenem v hlavičce (token se tak nedostane do URL ani logů). */
export async function vvApi<T>(path: string, token: string | null, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: {
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "X-VV-Token": token } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "network", "Nepodařilo se spojit se serverem. Zkontrolujte připojení k internetu.");
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; message?: string; details?: never };
    throw new ApiError(res.status, d.error ?? "error", d.message ?? `Chyba serveru (${res.status}).`, d.details);
  }
  return data as T;
}

/** Stažení souboru přes fetch (s hlavičkou tokenu) a uložení v prohlížeči. */
export async function downloadFile(path: string, token: string, fallbackName: string) {
  const res = await fetch(path, { headers: token ? { "X-VV-Token": token } : {}, credentials: "same-origin" });
  if (!res.ok) {
    let msg = `Soubor se nepodařilo stáhnout (${res.status}).`;
    try {
      msg = ((await res.json()) as { message?: string }).message ?? msg;
    } catch {
      /* není JSON */
    }
    throw new ApiError(res.status, "download", msg);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
