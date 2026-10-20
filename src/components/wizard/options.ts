/** Volby formuláře odvozené z normových tabulek (popisek + hodnota součinitele). */
import * as T from "@/core/risk/methodologies/csn-en-62305-2-ed2/tables";
import { fmtNum } from "@/core/util/format";

function opts<K extends string>(table: T.NormTable<K>, showValue = true) {
  return (Object.entries(table.rows) as [K, T.TableRow][]).map(([value, r]) => ({
    value,
    label: showValue ? `${r.label} (${table.symbol} = ${fmtNum(r.value)})` : r.label,
    help: r.help,
  }));
}

export const CD_OPTIONS = opts(T.TABLE_CD);
export const CI_OPTIONS = opts(T.TABLE_CI);
export const CT_OPTIONS = opts(T.TABLE_CT);
export const CE_OPTIONS = opts(T.TABLE_CE);
export const PB_OPTIONS = opts(T.TABLE_PB);
export const PSPD_OPTIONS = opts(T.TABLE_PSPD);
export const PEB_OPTIONS = opts(T.TABLE_PEB);
export const PTU_OPTIONS = opts(T.TABLE_PTU);
export const PTA_OPTIONS = opts(T.TABLE_PTA);
export const KS3_OPTIONS = opts(T.TABLE_KS3);
export const RT_FLOOR_OPTIONS = opts(T.TABLE_RT_FLOOR);
export const RP_OPTIONS = opts(T.TABLE_RP);
export const RF_OPTIONS = opts(T.TABLE_RF);
export const HZ_OPTIONS = opts(T.TABLE_HZ);
export const CL_OPTIONS = (Object.entries(T.TABLE_CLD_CLI.rows) as [T.ClKey, T.TableRow<{ cld: number; cli: number }>][]).map(([value, r]) => ({
  value,
  label: `${r.label} (CLD = ${fmtNum(r.value.cld)}, CLI = ${fmtNum(r.value.cli)})`,
}));
export const UW_OPTIONS = T.UW_VALUES.map((v) => ({ value: v, label: `${v.replace(".", ",")} kV` }));
export const RS_OPTIONS = [
  { value: "rs_5_20" as const, label: "5 Ω/km < RS ≤ 20 Ω/km" },
  { value: "rs_1_5" as const, label: "1 Ω/km < RS ≤ 5 Ω/km" },
  { value: "rs_le_1" as const, label: "RS ≤ 1 Ω/km" },
];

export const LOSS_TABLES = {
  L1_LT: T.TABLE_L1_LT,
  L1_LF: T.TABLE_L1_LF,
  L1_LO: T.TABLE_L1_LO,
  L2_LF: T.TABLE_L2_LF,
  L2_LO: T.TABLE_L2_LO,
  L3_LF: T.TABLE_L3_LF,
  L4_LT: T.TABLE_L4_LT,
  L4_LF: T.TABLE_L4_LF,
  L4_LO: T.TABLE_L4_LO,
} as const;

export const LOSS_TYPE_LABELS: Record<T.LossType, string> = {
  L1: "L1 – ztráta lidského života",
  L2: "L2 – ztráta veřejné služby",
  L3: "L3 – ztráta kulturního dědictví",
  L4: "L4 – ztráta ekonomické hodnoty",
};
