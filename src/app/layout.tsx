import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Amazon Core Analyzer - Competitive Analysis Platform",
  description: "AI-powered competitive analysis tool for Amazon sellers. Analyze Core 5 & Core 6 competitors with automated data scraping, AI polling, and detailed optimization recommendations.",
  keywords: ["Amazon", "competitive analysis", "Core 5", "Core 6", "seller tools", "market research", "AI analysis"],
  authors: [{ name: "Amazon Core Analyzer" }],
  creator: "Amazon Core Analyzer",
  publisher: "Amazon Core Analyzer",
  robots: "index, follow",
  openGraph: {
    title: "Amazon Core Analyzer - Competitive Analysis Platform",
    description: "AI-powered competitive analysis tool for Amazon sellers. Analyze Core 5 & Core 6 competitors with automated data scraping, AI polling, and detailed optimization recommendations.",
    type: "website",
    locale: "en_US",
    siteName: "Amazon Core Analyzer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Amazon Core Analyzer - Competitive Analysis Platform",
    description: "AI-powered competitive analysis tool for Amazon sellers. Analyze Core 5 & Core 6 competitors with automated data scraping, AI polling, and detailed optimization recommendations.",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
