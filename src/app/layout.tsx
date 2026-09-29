import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// next/font downloads the font at build time and serves it from our own
// origin. No request to Google at runtime, and no layout shift while it loads.
const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Sourcebook", template: "%s · Sourcebook" },
  description: "Stelle Fragen an deine eigenen Dokumente — mit belegten Antworten.",
  applicationName: "Sourcebook",
  openGraph: {
    title: "Sourcebook",
    description: "Stelle Fragen an deine eigenen Dokumente — mit belegten Antworten.",
    type: "website",
    locale: "de_DE",
  },
  // Everything of substance sits behind a login, so there is nothing useful
  // to index — and a demo should not turn up in search results.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${mono.variable} min-h-dvh bg-background font-sans text-foreground antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
