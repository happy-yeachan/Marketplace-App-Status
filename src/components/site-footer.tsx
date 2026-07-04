"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/use-translation";

const GITHUB_ISSUES_URL = "https://github.com/happy-yeachan/Marketplace-App-Status/issues";

export function SiteFooter() {
  const { t } = useTranslation();
  const pathname = usePathname();
  // The embed view lives inside small iframes — no room for a site footer.
  if (pathname.startsWith("/embed")) return null;
  return (
    <footer className="mt-auto border-t bg-background/40 py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-[11px] text-muted-foreground sm:flex-row">
        <p>{t("footer.line")}</p>
        <nav className="flex items-center gap-4">
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            {t("footer.feedback")}
          </a>
          <Link href="/privacy" className="hover:text-foreground">
            {t("footer.privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("footer.terms")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
