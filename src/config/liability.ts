/**
 * Prohlášení o odpovědnosti zpracovatele a vyloučení záruky – CENTRÁLNÍ TEXTY.
 * Uživatel je musí výslovně potvrdit před zaplacením / odemčením dokumentace
 * (server to ověřuje a ukládá do auditního záznamu) a text je vložen do výsledné zprávy,
 * do výsledků v aplikaci i do obchodních podmínek (čl. 6).
 *
 * Verzi zvyšte při každé věcné změně textu – audit ukládá potvrzenou verzi.
 */
export const LIABILITY_VERSION = "2026-10-20b";

/** Krátké upozornění – zobrazuje se u výsledků, na úvodní stránce a na titulní straně dokumentu. */
export const RESULT_DISCLAIMER =
  "Výsledek je orientační odhad vypočtený ze zadaných údajů. Provozovatel aplikace neručí za jeho správnost. " +
  "Kontrola vstupů i výsledku a jeho použití je plně na odpovědnosti zpracovatele s odpovídající odbornou kvalifikací.";

export const LIABILITY_CONFIRMATION =
  "Potvrzuji, že jsem osobou s odbornou kvalifikací potřebnou ke zpracování analýzy rizika ochrany před bleskem, " +
  "že jsem zadané a automaticky převzaté vstupní údaje zkontroloval(a) a že za jejich správnost, úplnost, za kontrolu " +
  "výsledku výpočtu i za jeho použití odpovídám výhradně já jako zpracovatel. Beru na vědomí, že výsledek je orientační " +
  "odhad, že provozovatel aplikace ARONLINE neručí za správnost výsledků, vstupních údajů ani dokumentace a nenese " +
  "odpovědnost za škody vzniklé jejich použitím.";

/** Text do závěru dokumentu (PDF/DOCX). */
export const LIABILITY_DOCUMENT_TEXT = [
  "Za správnost, úplnost a aktuálnost zadaných i automaticky převzatých vstupních údajů, za kontrolu výsledku výpočtu " +
    "a za jeho použití odpovídá výhradně zpracovatel uvedený v této zprávě. Zpracovatel před vydáním dokumentace potvrdil, " +
    "že má odbornou kvalifikaci potřebnou ke zpracování analýzy rizika a že vstupní údaje i výsledek zkontroloval.",
  "Aplikace ARONLINE je výpočetní pomůcka a její výsledek je orientačním odhadem. Provozovatel aplikace neručí za správnost " +
    "výsledků, za vstupní údaje převzaté z externích databází a mapových podkladů ani za škody vzniklé jejich použitím. " +
    "Výsledek nenahrazuje odborné posouzení a je nutné jej posoudit v kontextu konkrétní stavby a příslušných normových požadavků.",
];
