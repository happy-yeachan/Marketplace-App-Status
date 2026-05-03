"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function TermsPage() {
  const { t } = useTranslation();
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-sm leading-7">
      <header className="mb-10">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          {t("terms.back")}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t("terms.title")}</h1>
        <p className="mt-2 text-xs text-muted-foreground">{t("terms.lastUpdated")}</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("terms.serviceHeading")}</h2>
        <p>{t("terms.serviceBody")}</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">{t("terms.affilHeading")}</h2>
        <p>{t("terms.affilBody")}</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">{t("terms.accuracyHeading")}</h2>
        <p>{t("terms.accuracyBody")}</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">{t("terms.useHeading")}</h2>
        <p>{t("terms.useIntro")}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("terms.useBullet1")}</li>
          <li>{t("terms.useBullet2")}</li>
          <li>{t("terms.useBullet3")}</li>
        </ul>
        <p>{t("terms.useFooter")}</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">{t("terms.liabilityHeading")}</h2>
        <p>{t("terms.liabilityBody")}</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">{t("terms.changesHeading")}</h2>
        <p>{t("terms.changesBody")}</p>
      </section>
    </article>
  );
}
