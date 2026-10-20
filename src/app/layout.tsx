import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_URL } from "@/config/site";
import "./globals.css";

const DESCRIPTION =
  "Analýza rizika ochrany před bleskem (LPS) online podle ČSN EN 62305-2. Budova z katastru, bouřkové dny z mapy ČR, výpočet R1–R4 a dokumentace v PDF i DOCX s vaším razítkem. Jedna analýza 149 Kč i bez registrace.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Analýza rizika LPS online – ČSN EN 62305-2 | ARONLINE", template: "%s | ARONLINE" },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "analýza rizika",
    "analýza rizika LPS",
    "analýza rizika ochrany před bleskem",
    "výpočet rizika blesk",
    "ČSN EN 62305-2",
    "řízení rizika hromosvod",
    "hromosvod výpočet",
    "riziko úderu blesku",
    "analýza rizika FVE",
  ],
  authors: [{ name: "Filip Holesz – FVSOL", url: "https://fvsol.cz" }],
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Analýza rizika LPS online – ČSN EN 62305-2",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "Analýza rizika LPS online – ČSN EN 62305-2", description: DESCRIPTION },
  robots: { index: true, follow: true },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#14213d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
