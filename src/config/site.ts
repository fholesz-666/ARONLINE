/**
 * Veřejná adresa a SEO údaje webu.
 * SITE_URL = kanonická adresa (vlastní doména). Nastavuje se proměnnou APP_URL na Renderu.
 */
export const SITE_URL = (process.env.APP_URL || "https://aronline.onrender.com").replace(/\/$/, "");
export const SITE_NAME = "ARONLINE";

/** Veřejné stránky pro sitemap.xml – [cesta, priorita, četnost změn]. */
export const PUBLIC_PAGES: [string, number, "weekly" | "monthly" | "yearly"][] = [
  ["/", 1, "weekly"],
  ["/analyza-rizika-lps", 0.9, "monthly"],
  ["/analyza-rizika-fve", 0.8, "monthly"],
  ["/casto-kladene-otazky", 0.7, "monthly"],
  ["/cenik", 0.8, "monthly"],
  ["/metodika", 0.6, "monthly"],
  ["/o-aplikaci", 0.4, "yearly"],
  ["/pravni/obchodni-podminky", 0.2, "yearly"],
  ["/pravni/ochrana-osobnich-udaju", 0.2, "yearly"],
  ["/pravni/reklamace", 0.2, "yearly"],
];
