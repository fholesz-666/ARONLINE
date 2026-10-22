/**
 * Provozovatel služby ARONLINE – VÝCHOZÍ ÚDAJE.
 * Skutečně použité údaje se berou z nastavení ve správě webu (/app/admin/nastaveni), které má přednost.
 * Proměnné prostředí OPERATOR_* mají přednost před těmito výchozími hodnotami.
 */
export const OPERATOR = {
  name: process.env.OPERATOR_NAME || "Filip Holesz",
  ico: process.env.OPERATOR_ICO || "09000461",
  address: process.env.OPERATOR_ADDRESS || "",
  email: process.env.OPERATOR_EMAIL || "info@aronline.cz",
  phone: process.env.OPERATOR_PHONE || "",
  /** Kontakt pro zakázkovou projekci (FVSOL) – liší se od kontaktu na aplikaci. */
  projectEmail: "projekce@fvsol.cz",
  web: "https://fvsol.cz",
  brand: "FVSOL",
};

/** Účty, které získají roli správce po ověření e-mailu (doplňují proměnnou ADMIN_EMAILS). */
export const OWNER_ADMIN_EMAILS = ["fholesz@gmail.com"];
