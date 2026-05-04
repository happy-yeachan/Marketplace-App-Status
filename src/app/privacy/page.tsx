"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function PrivacyPage() {
  const { t, locale } = useTranslation();
  const hasJurisdictionSection = (["ja", "de", "ko", "fr"] as string[]).includes(locale);
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-sm leading-7">
      <header className="mb-10">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          {t("privacy.back")}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t("privacy.title")}</h1>
        <p className="mt-2 text-xs text-muted-foreground">{t("privacy.lastUpdated")}</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("privacy.shortHeading")}</h2>
        <p>{t("privacy.shortBody")}</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">{t("privacy.localHeading")}</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("privacy.local1")}</li>
          <li>{t("privacy.local2")}</li>
          <li>{t("privacy.local3")}</li>
        </ul>
        <p>{t("privacy.localFooter")}</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">{t("privacy.serverHeading")}</h2>
        <p>{t("privacy.serverBody1")}</p>
        <p>{t("privacy.serverBody2")}</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">{t("privacy.ipHeading")}</h2>
        <p>{t("privacy.ipBody")}</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">{t("privacy.cookiesHeading")}</h2>
        <p>{t("privacy.cookiesBody")}</p>
      </section>

      {hasJurisdictionSection && (
        <section className="mt-8 space-y-4">
          <h2 className="text-base font-semibold">{t("privacy.jurisdictionHeading")}</h2>
          <p>{t("privacy.jurisdictionBody")}</p>
        </section>
      )}

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">{t("privacy.contactHeading")}</h2>
        <p>{t("privacy.contactBody")}</p>
      </section>
    </article>
  );
}
