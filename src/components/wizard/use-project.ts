"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Ed2Input } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";
import type { FieldMeta, ProjectData } from "@/domain/project";
import { api, ApiError } from "@/lib/api";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";

export interface LoadedProject {
  id: string;
  name: string;
  status: string;
  version: number;
  methodologyId: string;
  data: ProjectData;
  objectLockedAt: string | null;
  unlocked: boolean;
}

/** Rozpracovaný vstup výpočtu (může být neúplný). */
export type CalcDraft = Partial<Omit<Ed2Input, "structure">> & { structure?: Partial<Ed2Input["structure"]> };

export function calcOf(d: ProjectData): CalcDraft {
  return d.calc as CalcDraft;
}

export function useProject(id: string) {
  const [project, setProject] = useState<LoadedProject | null>(null);
  const [data, setData] = useState<ProjectData | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const versionRef = useRef(0);
  const pending = useRef<ProjectData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ project: LoadedProject }>(`/api/projects/${id}`);
      versionRef.current = r.project.version;
      setProject(r.project);
      setData(r.project.data);
      setSaveState("idle");
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Projekt se nepodařilo načíst.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const flush = useCallback(async () => {
    if (inFlight.current || !pending.current) return;
    const toSave = pending.current;
    pending.current = null;
    inFlight.current = true;
    setSaveState("saving");
    try {
      const r = await api<{ version: number }>(`/api/projects/${id}`, { method: "PUT", body: { version: versionRef.current, data: toSave } });
      versionRef.current = r.version;
      setSaveState(pending.current ? "dirty" : "saved");
      setSaveError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setSaveState("conflict");
        setSaveError(e.message);
      } else {
        setSaveState("error");
        setSaveError(e instanceof ApiError ? e.message : "Uložení se nezdařilo.");
        pending.current ??= toSave; // zkusit znovu při další změně
      }
    } finally {
      inFlight.current = false;
      if (pending.current) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, 800);
      }
    }
  }, [id]);

  /** Úprava dat projektu (mutace na kopii) + naplánované automatické uložení. */
  const update = useCallback(
    (fn: (d: ProjectData) => void) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        fn(next);
        pending.current = next;
        return next;
      });
      setSaveState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 900);
    },
    [flush],
  );

  // uložit při opuštění stránky
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (pending.current || inFlight.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const saveNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await flush();
    // počkat na rozběhnuté uložení
    for (let i = 0; i < 50 && (inFlight.current || pending.current); i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (!inFlight.current && pending.current) await flush();
    }
  }, [flush]);

  return { project, data, update, saveState, saveError, loadError, reload: load, saveNow, setProject };
}

/* --- Pomocné funkce pro práci s cestami a původem hodnot ------------------ */

export function setProvenance(d: ProjectData, path: string, meta: FieldMeta | null) {
  if (meta) d.provenance[path] = meta;
  else delete d.provenance[path];
}

export const manual = (): FieldMeta => ({ origin: "manual", confirmed: true });
