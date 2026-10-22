import { requireAdmin } from "@/server/auth/session";
import { handler, json, readJson } from "@/server/http";
import { getSettings, getStoredTexts, saveSettings, zSettingsUpdate } from "@/server/services/settings";

export const GET = handler(async () => {
  await requireAdmin();
  return json({ settings: await getSettings(), storedTexts: await getStoredTexts() });
});

export const PUT = handler(async (req: Request) => {
  const c = await requireAdmin();
  const body = await readJson(req, zSettingsUpdate, 200_000);
  await saveSettings(body, c.user.id);
  return json({ ok: true, settings: await getSettings() });
});
