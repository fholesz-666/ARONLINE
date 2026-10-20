import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // samostatný výstup pro Docker / VPS
  output: "standalone",
  // balíčky s nativním kódem nebo vlastními fonty se nebalí do serverového bundlu
  serverExternalPackages: ["@node-rs/argon2", "pdfmake", "pg"],
  poweredByHeader: false,
  reactStrictMode: true,
  // vlastní soubory, které musí být v standalone výstupu (migrace)
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/pdfmake/build/vfs_fonts.js"],
  },
};

export default nextConfig;
