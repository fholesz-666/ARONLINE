import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";

/**
 * Celý průchod: registrace → profil → nová analýza → ruční vyplnění (bez ČÚZK) → výpočet
 * → platba přes simulovanou bránu → stažení PDF a DOCX.
 */
const email = `e2e-${Date.now()}@example.cz`;
const password = "Bezpecne-heslo-123";
const shots = process.env.E2E_SCREENSHOTS;

async function shot(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

function verifyEmailInDb() {
  // e-mail se v testu ověří přímo v DB (SMTP v testovacím prostředí není)
  const url = (process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/aronline").split("?")[0];
  execSync(`psql "${url}" -c "update users set email_verified_at = now() where email = '${email}'"`);
}

test("kompletní průchod analýzou s platbou a exportem", async ({ page }) => {
  page.on("dialog", (d) => d.accept());

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Analýza rizika");
  await shot(page, "01-uvod");

  await page.getByRole("link", { name: "Založit účet" }).first().click();
  await page.getByLabel("Jméno a příjmení").fill("Test Projektant");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill(password);
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Založit účet" }).click();
  await expect(page).toHaveURL(/\/app\/profil/);
  verifyEmailInDb();

  await page.getByLabel("Jméno a příjmení zpracovatele").fill("Ing. Test Projektant");
  await page.getByLabel("Firma").fill("Projekce Test s.r.o.");
  await page.getByLabel("IČO").fill("12345678");
  await page.getByRole("button", { name: "Uložit profil" }).click();
  await expect(page.getByText("Profil je uložený.")).toBeVisible();
  await shot(page, "02-profil");

  await page.getByRole("link", { name: "Analýzy" }).click();
  await page.getByLabel("Název projektu").fill("RD Test – FVE");
  await page.getByRole("button", { name: "Založit analýzu" }).click();
  await expect(page).toHaveURL(/\/app\/projekty\//);

  // 1. Identifikace
  await page.getByLabel("Název nebo jméno").fill("Jan Investor");
  await page.getByLabel("Adresa stavby").fill("Lesní 12, Jablonec nad Nisou");
  await shot(page, "03-identifikace");
  await page.getByRole("button", { name: /Pokračovat: Objekt/ }).click();

  // 2. Objekt – ruční rozměry
  await page.getByLabel("Délka L").fill("15");
  await page.getByLabel("Šířka W").fill("10");
  await page.getByLabel("Výška H", { exact: false }).first().fill("8");
  await shot(page, "04-objekt");
  await page.getByRole("button", { name: /Pokračovat: Okolí/ }).click();

  // 3. Okolí
  await page.getByLabel("Součinitel polohy objektu CD").selectOption("surrounded_same_or_lower");
  await page.getByRole("button", { name: /Pokračovat: Bouřková činnost/ }).click();

  // 4. Bouřková činnost
  await page.getByRole("radio", { name: /Hustota výbojů NG/ }).check();
  await page.getByRole("textbox", { name: /NG – hustota/ }).fill("2,5");
  await page.getByLabel("Zdroj hodnoty").fill("mapa bouřkové činnosti (test)");
  await page.getByRole("button", { name: /Pokračovat: Přívodní vedení/ }).click();

  // 5. Vedení
  await page.getByRole("button", { name: /NN přípojka – kabel v zemi/ }).click();
  await expect(page.getByLabel("Zdroj údajů o vedení")).toBeVisible();
  await shot(page, "05-vedeni");
  await page.getByRole("button", { name: /Pokračovat: Zóny a ztráty/ }).click();

  // 6. Zóny – předvyplněno podle druhu objektu
  await expect(page.getByText("Vnitřní systémy v zóně")).toBeVisible();
  await shot(page, "06-zony");
  await page.getByRole("button", { name: /Pokračovat: Ochranná opatření/ }).click();

  // 7. Opatření
  await page.getByLabel("Třída LPS / provedení (PB)").selectOption("lps_iii");
  await shot(page, "07-opatreni");
  await page.getByRole("button", { name: /Pokračovat: Kontrola údajů/ }).click();

  // 8. Kontrola
  await expect(page.getByText("Všechny údaje potřebné pro výpočet jsou vyplněné.")).toBeVisible();
  const confirmAll = page.getByRole("button", { name: /Potvrdit vše/ });
  if (await confirmAll.isVisible()) await confirmAll.click();
  await shot(page, "08-kontrola");
  await page.getByRole("button", { name: "Spočítat riziko" }).click();

  // 9. Výsledek
  await expect(page.getByText("R1 – ztráta lidského života")).toBeVisible({ timeout: 30_000 });
  await shot(page, "09-vysledek");

  // Platba přes simulovanou bránu – bez potvrzení odpovědnosti zpracovatele nelze
  await expect(page.getByRole("button", { name: /Zaplatit kartou/ })).toBeDisabled();
  await page.getByRole("checkbox", { name: /Potvrzuji, že jsem osobou/ }).check();
  await page.getByRole("button", { name: /Zaplatit kartou/ }).click();
  await expect(page).toHaveURL(/mock-brana/);
  await shot(page, "10-brana");
  await page.getByRole("button", { name: "Zaplatit (simulace)" }).click();
  await expect(page.getByText("Platba přijata")).toBeVisible({ timeout: 30_000 });
  await shot(page, "11-platba-prijata");
  await page.getByRole("link", { name: "Zpět k analýze" }).click();
  await expect(page.getByRole("link", { name: "Stáhnout PDF" })).toBeVisible({ timeout: 30_000 });

  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Stáhnout PDF" }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const [docx] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Stáhnout DOCX/ }).click()]);
  expect(docx.suggestedFilename()).toMatch(/\.docx$/);
  if (shots) {
    await pdf.saveAs(`${shots}/vystup.pdf`);
    await docx.saveAs(`${shots}/vystup.docx`);
  }
  await shot(page, "12-dokumentace");

  // Odemčený projekt – adresu už nelze změnit
  await page.getByRole("button", { name: /Identifikace a razítko/ }).click();
  await expect(page.getByLabel("Adresa stavby")).toBeDisabled();
});

test("nepřihlášený uživatel nemá přístup do aplikace ani k API", async ({ page, request }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/prihlaseni/);
  const r = await request.get("/api/projects");
  expect(r.status()).toBe(401);
  const post = await request.post("/api/projects", { data: { name: "x", buildingType: "family_house" } });
  expect(post.status()).toBe(403); // chybí hlavička Origin → CSRF ochrana
});
