/**
 * Obsah protokolu o určení vnějších vlivů – společný pro PDF i DOCX.
 */
import { NORM_REFERENCE, SECTION_LABELS, type VvSection } from "@/core/vv/catalog";
import { evaluateSpace, normalCodes } from "@/core/vv/evaluate";
import { VV_PRESETS } from "@/core/vv/presets";
import type { VvProtocolData } from "@/core/vv/schema";

export interface VvDocRow {
  name: string;
  code: string;
  label: string;
  normalCodes: string;
  abnormal: boolean;
  notConsidered: boolean;
}

export interface VvDocSpace {
  index: number;
  name: string;
  note: string;
  sections: { label: string; rows: VvDocRow[] }[];
  normal: boolean;
  minIp: string;
  reasons: string[];
  measures: string[];
}

export interface VvDocModel {
  title: string;
  subtitle: string;
  number: string;
  facts: [string, string][];
  committee: [string, string, string][];
  summary: [string, string, string, string, string][];
  spaces: VvDocSpace[];
  generalConclusion: string;
  notes: string;
  signPlaceDate: string;
  signatures: { name: string; role: string }[];
  confirmation: string;
  /** Bezplatná verze – reklamní patička a odkazy */
  branding: boolean;
  brandingLines: string[];
}

export function formatDateCz(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(`${iso.slice(0, 10)}T12:00:00Z`) : iso;
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}`;
}

export const VV_BRANDING_LINES = [
  "Protokol vytvořen zdarma na aronline.cz/vnejsi-vlivy",
  "Analýza rizika ochrany před bleskem (ČSN EN 62305-2): aronline.cz  ·  Projekce FVE a hromosvodů: fvsol.cz",
];

export function buildVvDoc(
  data: VvProtocolData,
  opts: { premium: boolean; confirmedAt?: string | Date | null },
): VvDocModel {
  const spaces: VvDocSpace[] = data.spaces.map((s, i) => {
    const ev = evaluateSpace(s.values);
    const bySection = new Map<VvSection, VvDocRow[]>();
    for (const r of ev.rows) {
      const list = bySection.get(r.influence.section) ?? [];
      list.push({
        name: r.influence.name,
        code: r.notConsidered ? "neuvažuje se" : (r.level?.code ?? "–"),
        label: r.notConsidered ? "–" : (r.level?.label ?? "–"),
        normalCodes: normalCodes(r.influence),
        abnormal: !r.notConsidered && !!r.level && !r.normal,
        notConsidered: r.notConsidered,
      });
      bySection.set(r.influence.section, list);
    }
    const presetNote = VV_PRESETS.find((p) => p.id === s.preset)?.note;
    const measures = [...new Set(ev.abnormal.map((r) => `${r.level!.code} – ${r.level!.measure ?? "Navrhnout opatření podle ČSN 33 2000-5-51."}`))];
    return {
      index: i + 1,
      name: s.name,
      note: [presetNote, s.note].filter(Boolean).join("\n"),
      sections: (["A", "B", "C"] as VvSection[]).map((sec) => ({ label: SECTION_LABELS[sec], rows: bySection.get(sec) ?? [] })),
      normal: ev.normal,
      minIp: ev.minIp,
      reasons: ev.abnormal.map((r) => `${r.level!.code} (${r.influence.name.toLowerCase()}: ${r.level!.label})`),
      measures,
    };
  });

  const o = data.object;
  const facts: [string, string][] = [
    ["Objekt / stavba", o.name],
    ["Adresa / parcela", o.address],
  ];
  if (o.investor) facts.push(["Objednatel / investor", o.investor]);
  if (o.description) facts.push(["Popis a účel", o.description]);
  facts.push(["Datum určení", formatDateCz(o.date)]);
  facts.push(["Použité podklady", (data.basis.length ? data.basis : [NORM_REFERENCE]).join("; ")]);

  const committee: [string, string, string][] = [
    ["Předseda", data.committee.chair.name, data.committee.chair.role],
    ...data.committee.members.map((m) => ["Člen", m.name, m.role] as [string, string, string]),
  ];

  const summary = spaces.map(
    (s) =>
      [
        String(s.index),
        s.name,
        s.normal ? "normální" : "abnormální",
        s.minIp,
        s.normal ? "–" : s.reasons.map((r) => r.split(" ")[0]).join(", "),
      ] as [string, string, string, string, string],
  );

  const members = [data.committee.chair, ...data.committee.members];
  return {
    title: "PROTOKOL O URČENÍ VNĚJŠÍCH VLIVŮ",
    subtitle: `vypracovaný odbornou komisí v souladu s ${NORM_REFERENCE}`,
    number: o.number,
    facts,
    committee,
    summary,
    spaces,
    generalConclusion:
      "Elektrická zařízení a vedení musí být vybrána a instalována s ohledem na vnější vlivy určené v tomto protokolu " +
      `(${NORM_REFERENCE}, příloha ZA). Pro vlivy, které nejsou normální, je nutné provést uvedená nebo rovnocenná opatření.`,
    notes: data.notes,
    signPlaceDate: `${o.place ? `V ${o.place} ` : ""}dne ${formatDateCz(o.date)}`,
    signatures: members.map((m) => ({ name: m.name, role: m.role })),
    confirmation: opts.confirmedAt
      ? `Všichni členové komise potvrdili určení vnějších vlivů elektronicky dne ${formatDateCz(opts.confirmedAt instanceof Date ? opts.confirmedAt : new Date(opts.confirmedAt))}.`
      : "",
    branding: !opts.premium,
    brandingLines: opts.premium ? [] : VV_BRANDING_LINES,
  };
}
