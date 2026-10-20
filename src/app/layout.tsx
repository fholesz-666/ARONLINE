import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ARONLINE – analýza rizika ochrany před bleskem", template: "%s | ARONLINE" },
  description:
    "Webová aplikace pro projektanty: analýza rizika ochrany před bleskem podle ČSN EN 62305-2 s automatickým načtením budovy z katastru a dokumentací v PDF a DOCX.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#14213d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
