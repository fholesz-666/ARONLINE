import { requireUser } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";
import { sendVerificationEmail } from "@/server/services/auth";

export const POST = handler(async () => {
  const c = await requireUser();
  if (c.user.emailVerified) return json({ ok: true, alreadyVerified: true });
  await enforce(`verify-resend:${c.user.id}`, LIMITS.passwordReset);
  await sendVerificationEmail(c.user.id, c.user.email);
  return json({ ok: true });
});
