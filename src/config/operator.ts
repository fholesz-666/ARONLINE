/**
 * Provozovatel služby ARONLINE – CENTRÁLNÍ ÚDAJE.
 * Proměnné prostředí OPERATOR_* mají přednost (lze je změnit na Renderu bez úpravy kódu).
 * IČO a sídlo je nutné doplnit před spuštěním placeného provozu.
 */
export const OPERATOR = {
  name: process.env.OPERATOR_NAME || "Filip Holesz",
  ico: process.env.OPERATOR_ICO || "",
  address: process.env.OPERATOR_ADDRESS || "",
  email: process.env.OPERATOR_EMAIL || "projekce@fvsol.cz",
  web: "https://fvsol.cz",
  brand: "FVSOL",
};
