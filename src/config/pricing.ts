/**
 * Výchozí ceník – CENTRÁLNÍ MÍSTO PRO CENY.
 * Hodnoty se při `npm run db:seed` zapíší do tabulky `products`. Ceny lze pak měnit
 * v administraci (/admin) bez zásahu do výpočetního jádra. Objednávka si cenu ukládá
 * jako snapshot, takže změna ceníku neovlivní již vytvořené objednávky.
 *
 * Limity předplatného (unlocksPerPeriod, maxMembers) jsou NÁVRH k obchodnímu rozhodnutí.
 */
export interface ProductDefinition {
  code: string;
  name: string;
  description: string;
  type: "ONE_TIME" | "SUBSCRIPTION";
  priceCzk: number;
  credits?: number;
  periodMonths?: number;
  unlocksPerPeriod?: number | null;
  maxMembers: number;
  features: string[];
  sortOrder: number;
}

/** Placená verze protokolu o určení vnějších vlivů (VV online). */
export const VV_PRODUCT_CODE = "VV_PREMIUM";

export const DEFAULT_PRODUCTS: ProductDefinition[] = [
  {
    code: "SINGLE",
    name: "Jednorázová analýza",
    description: "Odemčení jedné analýzy – stažení PDF a DOCX, opakované exporty téhož objektu.",
    type: "ONE_TIME",
    priceCzk: 149,
    credits: 1,
    maxMembers: 1,
    features: ["1 analýza (1 objekt)", "PDF + editovatelný DOCX", "Neomezené úpravy a exporty téhož objektu"],
    sortOrder: 10,
  },
  {
    code: "PACK20",
    name: "Balíček 20 analýz",
    description: "20 kreditů pro odemčení analýz. Kredity nemají omezenou platnost.",
    type: "ONE_TIME",
    priceCzk: 1490,
    credits: 20,
    maxMembers: 1,
    features: ["20 analýz", "Cena 74,50 Kč za analýzu", "Kredity bez časového omezení"],
    sortOrder: 20,
  },
  {
    code: "SUB_PRO",
    name: "Profesionální předplatné",
    description: "Měsíční předplatné pro jednoho projektanta.",
    type: "SUBSCRIPTION",
    priceCzk: 499,
    periodMonths: 1,
    unlocksPerPeriod: 30,
    maxMembers: 1,
    features: ["Až 30 analýz měsíčně", "1 uživatel", "Šablony vedení a zón", "Automatické měsíční obnovení, zrušení kdykoli"],
    sortOrder: 30,
  },
  {
    code: "SUB_COMPANY",
    name: "Firemní předplatné",
    description: "Měsíční předplatné pro firmu – sdílené projekty, šablony a profily zpracovatelů.",
    type: "SUBSCRIPTION",
    priceCzk: 1990,
    periodMonths: 1,
    unlocksPerPeriod: 150,
    maxMembers: 5,
    features: ["Až 150 analýz měsíčně", "Až 5 uživatelů", "Sdílené projekty a šablony", "Více profilů zpracovatele"],
    sortOrder: 40,
  },
  {
    code: VV_PRODUCT_CODE,
    name: "Protokol o určení vnějších vlivů – Profi",
    description: "Placená verze protokolu VV online: bez patičky s reklamou, s vlastním logem, ke stažení i jako editovatelný DOCX.",
    type: "ONE_TIME",
    priceCzk: 99,
    maxMembers: 1,
    features: ["Bez vodoznaku a reklamní patičky", "Vlastní logo v záhlaví", "Editovatelný Word (DOCX)", "Uložení do účtu (Moje protokoly)"],
    sortOrder: 90,
  },
];

/** Produkty služby VV online se nezobrazují v ceníku analýz rizika. */
export function isAnalysisProduct(code: string): boolean {
  return !code.startsWith("VV_");
}
