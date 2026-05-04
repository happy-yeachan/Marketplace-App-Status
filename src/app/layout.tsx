import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteFooter } from "@/components/site-footer";
import { LocaleProvider } from "@/lib/i18n/use-translation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://marketplace-app-status.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Marketplace App Status — Real-time Jira & Confluence App Health",
  description:
    "Monitor the live service health of your Atlassian Marketplace apps — ScriptRunner, Tempo, draw.io, Zephyr and hundreds more. One dashboard, no login required.",
  keywords: [
    "Jira",
    "Confluence",
    "Atlassian",
    "app status",
    "service health",
    "monitoring",
    "marketplace",
    "ScriptRunner",
    "Tempo",
    "Zephyr",
  ],
  alternates: { canonical: SITE_URL },
  // /favicon.ico (App Router auto-detects) handles the .ico fallback;
  // app/apple-icon.tsx generates the 180×180 apple-touch-icon at build time.
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Marketplace App Status",
    description:
      "Real-time service health for Jira & Confluence marketplace apps. One dashboard for all your installed apps.",
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Marketplace App Status",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketplace App Status",
    description: "Real-time service health for Jira & Confluence marketplace apps.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head />
      <body className="min-h-full flex flex-col">
        {/* Prevent dark-mode flash — must run before React hydration */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&p))document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
        <LocaleProvider>
          <TooltipProvider>
            {children}
            <SiteFooter />
          </TooltipProvider>
        </LocaleProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
