import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atlassian-app-status.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Atlassian App Status — Real-time Jira & Confluence App Health",
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
    title: "Atlassian App Status",
    description:
      "Real-time service health for Jira & Confluence marketplace apps. One dashboard for all your installed apps.",
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Atlassian App Status",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atlassian App Status",
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
      <head>
        {/* Prevent dark-mode flash — runs before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&p))document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          {children}
          <SiteFooter />
        </TooltipProvider>
      </body>
    </html>
  );
}
