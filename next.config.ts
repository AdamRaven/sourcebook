import type { NextConfig } from "next";

// Security headers. None of these are exotic — they are the baseline a
// reviewer expects to find, and their absence is what gets noticed.
const securityHeaders = [
  // No other site may frame this app, which rules out clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Stops the browser from guessing a type other than the one we declared.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Do not leak the full path of our pages to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app needs none of these, so it asks for none of them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
