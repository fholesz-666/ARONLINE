/**
 * Datový model protokolu o určení vnějších vlivů (sdílený klientem i serverem).
 */
import { z } from "zod";
import { NOT_CONSIDERED, VV_CATALOG } from "./catalog";

const str = (max: number) => z.string().trim().max(max);
const required = (max: number, message: string) => z.string().trim().min(1, message).max(max);

export const zPerson = z.object({
  name: required(120, "Zadejte jméno"),
  role: str(160).default(""),
});

export const zSpace = z
  .object({
    id: z.string().min(1).max(40),
    name: required(160, "Zadejte název prostoru"),
    preset: str(40).optional(),
    note: str(2000).default(""),
    values: z.record(z.string().max(12), z.string().max(12)),
  })
  .superRefine((s, ctx) => {
    for (const inf of VV_CATALOG) {
      const v = s.values[inf.id];
      const ok = (v === NOT_CONSIDERED && inf.allowNotConsidered) || inf.levels.some((l) => l.code === v);
      if (!ok) ctx.addIssue({ code: "custom", path: ["values", inf.id], message: `Vyberte hodnotu vlivu ${inf.name}` });
    }
  });

export const zProtocolData = z.object({
  version: z.literal(1).default(1),
  object: z.object({
    name: required(200, "Zadejte název objektu"),
    address: required(300, "Zadejte adresu nebo parcelu"),
    description: str(2000).default(""),
    investor: str(200).default(""),
    number: str(60).default(""),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Zadejte datum"),
    place: str(120).default(""),
  }),
  basis: z.array(str(200)).max(20).default([]),
  committee: z.object({
    chair: zPerson,
    members: z.array(zPerson).min(1, "Komise musí mít alespoň jednoho dalšího člena").max(8),
  }),
  spaces: z.array(zSpace).min(1, "Přidejte alespoň jeden prostor").max(60),
  notes: str(4000).default(""),
});

export type VvProtocolData = z.infer<typeof zProtocolData>;
export type VvSpace = z.infer<typeof zSpace>;
export type VvPerson = z.infer<typeof zPerson>;

/** Počet členů komise včetně předsedy – tolik potvrzení musí být zaškrtnuto. */
export function committeeSize(d: Pick<VvProtocolData, "committee">): number {
  return 1 + d.committee.members.length;
}
