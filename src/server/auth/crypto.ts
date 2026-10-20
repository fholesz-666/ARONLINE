import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

/** Argon2id s parametry doporučenými OWASP (m=19 MiB, t=2, p=1). */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Náhodný token (base64url, 32 B). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Pravidla hesla: min. 10 znaků, nesmí být jen z jednoho typu znaků. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return "Heslo musí mít alespoň 10 znaků.";
  if (password.length > 200) return "Heslo je příliš dlouhé.";
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 2) return "Heslo musí kombinovat alespoň dva typy znaků (malá/velká písmena, číslice, symboly).";
  return null;
}
