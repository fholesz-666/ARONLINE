/**
 * Prohlášení o odpovědnosti zpracovatele – CENTRÁLNÍ TEXTY.
 * Uživatel je musí výslovně potvrdit před zaplacením / odemčením dokumentace
 * (server to ověřuje a ukládá do auditního záznamu) a text je vložen do výsledné zprávy
 * i do obchodních podmínek (čl. 6).
 *
 * Verzi zvyšte při každé věcné změně textu – audit ukládá potvrzenou verzi.
 */
export const LIABILITY_VERSION = "2026-10-20";

export const LIABILITY_CONFIRMATION =
  "Potvrzuji, že jsem osobou s odbornou kvalifikací potřebnou ke zpracování analýzy rizika ochrany před bleskem, " +
  "že jsem zadané a automaticky převzaté vstupní údaje zkontroloval(a) a že za jejich správnost, úplnost a za kontrolu " +
  "výsledku výpočtu odpovídám já jako zpracovatel. Beru na vědomí, že provozovatel aplikace ARONLINE za správnost " +
  "výsledků, vstupních údajů ani za jejich použití v projektové dokumentaci neručí.";

/** Text do závěru dokumentu (PDF/DOCX). */
export const LIABILITY_DOCUMENT_TEXT = [
  "Za správnost, úplnost a aktuálnost zadaných i automaticky převzatých vstupních údajů, za kontrolu výsledku výpočtu " +
    "a za jeho použití odpovídá výhradně zpracovatel uvedený v této zprávě. Zpracovatel před vydáním dokumentace potvrdil, " +
    "že má odbornou kvalifikaci potřebnou ke zpracování analýzy rizika a že vstupní údaje i výsledek zkontroloval.",
  "Aplikace ARONLINE je výpočetní pomůcka. Provozovatel aplikace neručí za správnost výsledků, za vstupní údaje převzaté " +
    "z externích databází a mapových podkladů ani za škody vzniklé jejich použitím. Výsledek je nutné posoudit v kontextu " +
    "konkrétní stavby a příslušných normových požadavků.",
];
