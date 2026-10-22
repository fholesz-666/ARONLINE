import { describe, expect, it } from "vitest";
import { canonicalUrl, isAllowedOrigin } from "./origin";

const ctx = { appUrl: "https://aronline.onrender.com", nextOrigin: "http://localhost:10000", host: "aronline.cz" };

describe("kontrola původu (CSRF)", () => {
  it("povolí stránku z vlastní domény i z APP_URL", () => {
    expect(isAllowedOrigin("https://aronline.cz", ctx)).toBe(true);
    expect(isAllowedOrigin("https://aronline.onrender.com", { ...ctx, host: "aronline.onrender.com" })).toBe(true);
    expect(isAllowedOrigin("https://www.aronline.cz", { ...ctx, allowedOrigins: "https://www.aronline.cz" })).toBe(true);
  });
  it("odmítne cizí web a chybějící Origin", () => {
    expect(isAllowedOrigin("https://evil.example", ctx)).toBe(false);
    expect(isAllowedOrigin(null, ctx)).toBe(false);
    expect(isAllowedOrigin("nesmysl", ctx)).toBe(false);
  });
});

describe("kanonická adresa", () => {
  const base = { appUrl: "https://aronline.cz", method: "GET", pathname: "/cenik", search: "?a=1" };
  it("www a adresa Renderu → aronline.cz", () => {
    expect(canonicalUrl({ ...base, host: "www.aronline.cz" })).toBe("https://aronline.cz/cenik?a=1");
    expect(canonicalUrl({ ...base, host: "aronline.onrender.com" })).toBe("https://aronline.cz/cenik?a=1");
  });
  it("bez přesměrování: kanonický host, API, POST, APP_URL na Renderu", () => {
    expect(canonicalUrl({ ...base, host: "aronline.cz" })).toBeNull();
    expect(canonicalUrl({ ...base, host: "www.aronline.cz", pathname: "/api/health" })).toBeNull();
    expect(canonicalUrl({ ...base, host: "www.aronline.cz", method: "POST" })).toBeNull();
    expect(canonicalUrl({ ...base, appUrl: "https://aronline.onrender.com", host: "aronline.onrender.com" })).toBeNull();
  });
});
