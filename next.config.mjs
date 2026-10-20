/** @type {import('next').NextConfig} */
const nextConfig = {
  // balíčky s nativním kódem nebo vlastními fonty se nebalí do serverového bundlu
  serverExternalPackages: ["@node-rs/argon2", "pdfmake", "pg"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
