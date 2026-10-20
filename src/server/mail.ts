/**
 * Odesílání e-mailů přes SMTP. Bez SMTP ve vývoji vypíše zprávu do konzole.
 * V produkci bez SMTP zprávu neodešle a zaloguje chybu (bez obsahu).
 */
import nodemailer, { type Transporter } from "nodemailer";
import { getConfig } from "./config";
import { errorMeta, log } from "./log";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** Odeslané zprávy v testech (APP_ENV=test). */
export const testOutbox: Mail[] = [];

let transporter: Transporter | null = null;

export async function sendMail(mail: Mail): Promise<boolean> {
  const c = getConfig();
  if (c.APP_ENV === "test") {
    testOutbox.push(mail);
    return true;
  }
  if (!c.SMTP_HOST) {
    if (c.isProduction) {
      log.error("mail_not_configured", { subject: mail.subject });
      return false;
    }
    // Jen vývoj: výpis do konzole, aby šlo projít registraci bez SMTP.
    console.log(`\n--- DEV E-MAIL (neodesláno) ---\nKomu: ${mail.to}\nPředmět: ${mail.subject}\n\n${mail.text}\n--- KONEC ---\n`);
    return true;
  }
  transporter ??= nodemailer.createTransport({
    host: c.SMTP_HOST,
    port: c.SMTP_PORT ?? 587,
    secure: c.SMTP_SECURE,
    auth: c.SMTP_USER ? { user: c.SMTP_USER, pass: c.SMTP_PASSWORD } : undefined,
  });
  try {
    await transporter.sendMail({ from: c.MAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text });
    log.info("mail_sent", { subject: mail.subject });
    return true;
  } catch (e) {
    log.error("mail_failed", { subject: mail.subject, ...errorMeta(e) });
    return false;
  }
}

const footer = "\n\n—\nARONLINE – analýza rizika ochrany před bleskem\nTato zpráva byla odeslána automaticky.";

export const mails = {
  verifyEmail: (to: string, link: string): Mail => ({
    to,
    subject: "Potvrzení e-mailové adresy – ARONLINE",
    text: `Dobrý den,\n\npro potvrzení e-mailové adresy otevřete tento odkaz (platí 48 hodin):\n${link}\n\nPokud jste se neregistrovali, zprávu prosím ignorujte.${footer}`,
  }),
  resetPassword: (to: string, link: string): Mail => ({
    to,
    subject: "Obnovení hesla – ARONLINE",
    text: `Dobrý den,\n\npro nastavení nového hesla otevřete tento odkaz (platí 1 hodinu):\n${link}\n\nPokud jste o obnovení nežádali, zprávu ignorujte – heslo zůstane beze změny.${footer}`,
  }),
  invitation: (to: string, workspaceName: string, link: string): Mail => ({
    to,
    subject: `Pozvánka do týmu ${workspaceName} – ARONLINE`,
    text: `Dobrý den,\n\nbyli jste pozváni do týmu „${workspaceName}“ v aplikaci ARONLINE.\nPozvánku přijmete zde (platí 7 dní):\n${link}${footer}`,
  }),
  paymentReceived: (to: string, orderNumber: string, productName: string, amount: string): Mail => ({
    to,
    subject: `Platba přijata – objednávka ${orderNumber}`,
    text: `Dobrý den,\n\nděkujeme, platba za „${productName}“ (${amount}) byla přijata.\nPřehled objednávek najdete v aplikaci v sekci Předplatné a kredity.${footer}`,
  }),
};
