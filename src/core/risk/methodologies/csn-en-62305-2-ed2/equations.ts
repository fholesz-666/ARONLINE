/**
 * Rovnice metodiky ČSN EN 62305-2 ed. 2:2013 (IEC 62305-2:2010).
 *
 * Číslování rovnic odpovídá znalosti implementátora a musí se ověřit
 * proti textu normy (docs/verification-checklist.md).
 */
import type { NormEquation, PublicSource } from "../../types";

const DEHN_LPG: PublicSource = {
  title: "DEHN – Lightning Protection Guide, 3. vyd. (2014), kap. 3.2",
  url: "https://www.dehn-international.com/sites/default/files/media/files/lpg_en_complete.pdf",
  checkedAt: "2026-10-20",
};
const NVB_REPORT: PublicSource = {
  title:
    "Veřejná zpráva „Výpočet řízení rizika dle ČSN EN 62305-2 ed. 2“ (Bílovec, 2023) – číselná shoda AD, AM, ND, NM, AL, AI, NL, NI",
  url: "https://www.nvb.cz/base/files/attachments/831/61399-23022-3a-Vypocet-rizeni-rizik.pdf",
  checkedAt: "2026-10-20",
};

const P_DEHN = "Vzorec odpovídá veřejnému zdroji DEHN LPG. Proti textu ČSN neověřeno.";
const P_DEHN_NVB =
  "Vzorec odpovídá veřejnému zdroji DEHN LPG a číselně se shoduje s veřejnou zprávou (test v src/core/risk/__tests__). Proti textu ČSN neověřeno.";
const P_MEM = "Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno.";

function eq(
  id: string,
  symbol: string,
  formula: string,
  normRef: string,
  provenance: string,
  publicSources: PublicSource[] = [],
): NormEquation {
  return { id, symbol, formula, normRef, provenance, publicSources };
}

export const EQUATIONS = {
  NG_FROM_TD: eq("ED2.EQ.A.1", "NG", "NG ≈ 0,1 · TD", "příloha A, rov. (A.1)", P_DEHN, [DEHN_LPG]),
  NG_FROM_TD_443: eq(
    "CSN.332000-4-443.EQ.NG",
    "NG",
    "NG = 0,04 · TD^1,25",
    "ČSN 33 2000-4-443 ed. 2, čl. 443.3.2.1",
    "Vztah uvedený v nápovědě programu OEZ Prozik 2.60 (odkaz na ČSN 33 2000-4-443 ed. 2, čl. 443.3.2.1); číselně ověřeno na protokolech Prozik (Td 24 → NG 2,12; Td 25 → NG 2,24). Proti textu ČSN 33 2000-4-443 neověřeno.",
    [],
  ),
  AD: eq(
    "ED2.EQ.A.2",
    "AD",
    "AD = L · W + 2 · (3 · H) · (L + W) + π · (3 · H)²",
    "příloha A, rov. (A.2)",
    P_DEHN_NVB,
    [DEHN_LPG, NVB_REPORT],
  ),
  AD_PROMINENT: eq("ED2.EQ.A.3", "AD'", "AD' = π · (3 · Hp)²", "příloha A, rov. (A.3)", P_MEM),
  ND: eq("ED2.EQ.A.4", "ND", "ND = NG · AD · CD · 10⁻⁶", "příloha A, rov. (A.4)", P_DEHN_NVB, [DEHN_LPG, NVB_REPORT]),
  NDJ: eq("ED2.EQ.A.5", "NDJ", "NDJ = NG · ADJ · CDJ · CT · 10⁻⁶", "příloha A, rov. (A.5)", P_MEM),
  NM: eq("ED2.EQ.A.6", "NM", "NM = NG · AM · 10⁻⁶", "příloha A, rov. (A.6)", P_DEHN_NVB, [DEHN_LPG, NVB_REPORT]),
  AM: eq(
    "ED2.EQ.A.7",
    "AM",
    "AM = 2 · 500 · (L + W) + π · 500²",
    "příloha A, rov. (A.7)",
    P_DEHN_NVB,
    [DEHN_LPG, NVB_REPORT],
  ),
  NL: eq(
    "ED2.EQ.A.8",
    "NL",
    "NL = NG · AL · CI · CE · CT · 10⁻⁶",
    "příloha A, rov. (A.8)",
    P_DEHN_NVB,
    [DEHN_LPG, NVB_REPORT],
  ),
  AL: eq("ED2.EQ.A.9", "AL", "AL = 40 · LL", "příloha A, rov. (A.9)", P_DEHN_NVB, [DEHN_LPG, NVB_REPORT]),
  NI: eq(
    "ED2.EQ.A.10",
    "NI",
    "NI = NG · AI · CI · CE · CT · 10⁻⁶",
    "příloha A, rov. (A.10)",
    P_DEHN_NVB,
    [DEHN_LPG, NVB_REPORT],
  ),
  AI: eq("ED2.EQ.A.11", "AI", "AI = 4 000 · LL", "příloha A, rov. (A.11)", P_DEHN_NVB, [DEHN_LPG, NVB_REPORT]),

  PA: eq("ED2.EQ.B.1", "PA", "PA = PTA · PB", "příloha B, rov. (B.1)", P_DEHN, [DEHN_LPG]),
  PC: eq("ED2.EQ.B.2", "PC", "PC = PSPD · CLD", "příloha B, rov. (B.2)", P_DEHN, [DEHN_LPG]),
  PC_MULTI: eq("ED2.EQ.B.3", "PC", "PC = 1 − Π (1 − PCi)", "příloha B, rov. (B.3)", P_MEM),
  PM: eq("ED2.EQ.B.4", "PM", "PM = PSPD · PMS", "příloha B, rov. (B.4)", P_MEM),
  PMS: eq("ED2.EQ.B.5", "PMS", "PMS = (KS1 · KS2 · KS3 · KS4)²", "příloha B, rov. (B.5)", P_MEM),
  KS1: eq("ED2.EQ.B.6", "KS1", "KS1 = 0,12 · wm1 (max. 1)", "příloha B, rov. (B.6)", P_MEM),
  KS2: eq("ED2.EQ.B.7", "KS2", "KS2 = 0,12 · wm2 (max. 1)", "příloha B, rov. (B.7)", P_MEM),
  KS4: eq("ED2.EQ.B.8", "KS4", "KS4 = 1 / UW", "příloha B, rov. (B.8)", P_MEM),
  PU: eq("ED2.EQ.B.9", "PU", "PU = PTU · PEB · PLD · CLD", "příloha B, rov. (B.9)", P_MEM),
  PV: eq("ED2.EQ.B.10", "PV", "PV = PEB · PLD · CLD", "příloha B, rov. (B.10)", P_MEM),
  PW: eq("ED2.EQ.B.11", "PW", "PW = PSPD · PLD · CLD", "příloha B, rov. (B.11)", P_MEM),
  PZ: eq("ED2.EQ.B.12", "PZ", "PZ = PSPD · PLI · CLI", "příloha B, rov. (B.12)", P_MEM),

  L1_LA: eq("ED2.EQ.C.1", "LA", "LA = rt · LT · nz/nt · tz/8 760", "příloha C, rov. (C.1)", P_MEM),
  L1_LU: eq("ED2.EQ.C.2", "LU", "LU = rt · LT · nz/nt · tz/8 760", "příloha C, rov. (C.2)", P_MEM),
  L1_LB: eq("ED2.EQ.C.3", "LB = LV", "LB = LV = rp · rf · hz · LF · nz/nt · tz/8 760", "příloha C, rov. (C.3)", P_MEM),
  L1_LC: eq("ED2.EQ.C.4", "LC = LM = LW = LZ", "LC = LM = LW = LZ = LO · nz/nt · tz/8 760", "příloha C, rov. (C.4)", P_MEM),
  L2_LB: eq("ED2.EQ.C.5", "LB = LV", "LB = LV = rp · rf · LF · nz/nt", "příloha C, rov. (C.5)", P_MEM),
  L2_LC: eq("ED2.EQ.C.6", "LC = LM = LW = LZ", "LC = LM = LW = LZ = LO · nz/nt", "příloha C, rov. (C.6)", P_MEM),
  L3_LB: eq("ED2.EQ.C.7", "LB = LV", "LB = LV = rp · rf · LF · cz/ct", "příloha C, rov. (C.7)", P_MEM),
  L4_LA: eq("ED2.EQ.C.8", "LA = LU", "LA = LU = rt · LT · ca/ct", "příloha C, rov. (C.8)", P_MEM),
  L4_LB: eq("ED2.EQ.C.9", "LB = LV", "LB = LV = rp · rf · LF · (ca + cb + cc + cs)/ct", "příloha C, rov. (C.9)", P_MEM),
  L4_LC: eq("ED2.EQ.C.10", "LC = LM = LW = LZ", "LC = LM = LW = LZ = LO · cs/ct", "příloha C, rov. (C.10)", P_MEM),

  RX: eq("ED2.EQ.6.1", "RX", "RX = NX · PX · LX", "kap. 6.1 (základní rovnice)", P_DEHN, [DEHN_LPG]),
  RA: eq("ED2.EQ.6.2.RA", "RA", "RA = ND · PA · LA", "kap. 6.2", P_MEM),
  RB: eq("ED2.EQ.6.2.RB", "RB", "RB = ND · PB · LB", "kap. 6.2", P_MEM),
  RC: eq("ED2.EQ.6.2.RC", "RC", "RC = ND · PC · LC", "kap. 6.2", P_MEM),
  RM: eq("ED2.EQ.6.3.RM", "RM", "RM = NM · PM · LM", "kap. 6.3", P_MEM),
  RU: eq("ED2.EQ.6.4.RU", "RU", "RU = (NL + NDJ) · PU · LU", "kap. 6.4", P_MEM),
  RV: eq("ED2.EQ.6.4.RV", "RV", "RV = (NL + NDJ) · PV · LV", "kap. 6.4", P_MEM),
  RW: eq("ED2.EQ.6.4.RW", "RW", "RW = (NL + NDJ) · PW · LW", "kap. 6.4", P_MEM),
  RZ: eq("ED2.EQ.6.5.RZ", "RZ", "RZ = NI · PZ · LZ", "kap. 6.5", P_MEM),

  R1: eq(
    "ED2.EQ.4.3.R1",
    "R1",
    "R1 = RA1 + RB1 + RC1* + RM1* + RU1 + RV1 + RW1* + RZ1*  (* jen u objektů s nebezpečím výbuchu, nemocnic se životně důležitými zařízeními a objektů, kde porucha vnitřních systémů přímo ohrožuje život)",
    "kap. 4.3",
    P_MEM,
  ),
  R2: eq("ED2.EQ.4.3.R2", "R2", "R2 = RB2 + RC2 + RM2 + RV2 + RW2 + RZ2", "kap. 4.3", P_MEM),
  R3: eq("ED2.EQ.4.3.R3", "R3", "R3 = RB3 + RV3", "kap. 4.3", P_MEM),
  R4: eq(
    "ED2.EQ.4.3.R4",
    "R4",
    "R4 = RA4** + RB4 + RC4 + RM4 + RU4** + RV4 + RW4 + RZ4  (** jen kde může dojít ke ztrátě zvířat)",
    "kap. 4.3",
    P_MEM,
  ),
} satisfies Record<string, NormEquation>;

export type EquationKey = keyof typeof EQUATIONS;
export const ALL_EQUATIONS: NormEquation[] = Object.values(EQUATIONS);
