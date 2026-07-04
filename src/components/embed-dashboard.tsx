"use client";

// Read-only embed view — designed to live inside a Confluence iframe.
//
// Deliberately STATELESS: the app list comes from the `#apps=` hash (same
// codec as share links) and nothing touches localStorage. Third-party
// iframes get partitioned/blocked storage in several browsers, so a
// storage-backed embed would silently break exactly where it's used.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Wrench,
} from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { isLocale } from "@/lib/i18n/locales";
import { useTranslation } from "@/lib/i18n/use-translation";
import { decodeSharePayload, encodeSharePayload, parseEmbedHash } from "@/lib/share";
import {
  fetchStatusBatched,
  localizeStatusMessage,
  STATUS_TEXT_CLASS,
  toStatusPageUrl,
} from "@/lib/status-client";
import { cn } from "@/lib/utils";
import type { AppHealthStatus, HealthCheckResult, RegisteredApp } from "@/types";

const EMBED_REFRESH_MS = 5 * 60_000;
// Teammates often open the same wiki page together — jitter the refresh
// cadence so N viewers don't hit the vendor APIs in lockstep.
const REFRESH_JITTER_MS = 30_000;

const STATUS_ICON: Record<AppHealthStatus, React.ReactNode> = {
  operational: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  degraded: <CircleDashed className="h-3.5 w-3.5 text-amber-500" />,
  outage: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  maintenance: <Wrench className="h-3.5 w-3.5 text-blue-500" />,
};

export function EmbedDashboard() {
  const { t, locale, setLocale } = useTranslation();

  // The hash is present from the very first client render (it's part of the
  // iframe src), so a lazy initializer avoids any setState-in-effect dance.
  const [payload] = useState<string | null>(() =>
    typeof window === "undefined" ? null : parseEmbedHash(),
  );
  const [apps, setApps] = useState<RegisteredApp[] | null>(null);
  const [decodeFailed, setDecodeFailed] = useState(false);
  const [latestById, setLatestById] = useState<Record<string, HealthCheckResult>>({});
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const isCheckingRef = useRef(false);

  // ?theme=dark|light forces a theme (default: the root layout's auto
  // detection); ?lang=ko|ja|… pins the UI language for the whole team page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get("theme");
    if (theme === "dark") document.documentElement.classList.add("dark");
    if (theme === "light") document.documentElement.classList.remove("dark");
    const lang = params.get("lang");
    if (lang && isLocale(lang)) setLocale(lang);
  }, [setLocale]);

  const checkAll = useCallback(async (list: RegisteredApp[]) => {
    if (isCheckingRef.current) return;
    const checkable = list.filter((a) => a.statusUrl);
    if (checkable.length === 0) return;
    isCheckingRef.current = true;
    try {
      const data = await fetchStatusBatched(checkable);
      if (data?.results) {
        setLatestById((prev) => ({
          ...prev,
          ...Object.fromEntries(data.results.map((r) => [r.appId, r])),
        }));
        setLastCheckedAt(new Date());
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  // Decode the app list, then run the first check immediately.
  useEffect(() => {
    if (!payload) return;
    void decodeSharePayload(payload).then((decoded) => {
      if (decoded && decoded.length > 0) {
        setApps(decoded);
        // buildShareUrl uses the CURRENT pathname (/embed here) — build the
        // dashboard link against the site root explicitly instead.
        void encodeSharePayload(decoded).then((p) =>
          setShareUrl(`${window.location.origin}/#share=${p}`),
        );
        void checkAll(decoded);
      } else {
        setDecodeFailed(true);
      }
    });
  }, [payload, checkAll]);

  // Fixed 5-minute refresh with a per-viewer jitter offset.
  useEffect(() => {
    if (!apps || apps.length === 0) return;
    const jitter = Math.random() * REFRESH_JITTER_MS;
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      void checkAll(apps);
      intervalId = window.setInterval(() => void checkAll(apps), EMBED_REFRESH_MS);
    }, EMBED_REFRESH_MS + jitter);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [apps, checkAll]);

  // ── Invalid / missing payload ────────────────────────────────────────────
  if (!payload || decodeFailed) {
    return (
      <main className="flex min-h-40 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {t("embed.invalid")}
      </main>
    );
  }

  if (!apps) {
    return (
      <main className="p-3">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 rounded bg-muted" />
          ))}
        </div>
      </main>
    );
  }

  const vals = Object.values(latestById);
  const counts = {
    operational: vals.filter((r) => r.status === "operational").length,
    degraded: vals.filter((r) => r.status === "degraded").length,
    outage: vals.filter((r) => r.status === "outage").length,
    maintenance: vals.filter((r) => r.status === "maintenance").length,
  };

  return (
    <main className="p-3 text-sm">
      {/* Summary bar */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1 text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {counts.operational}
        </span>
        <span className="flex items-center gap-1 text-amber-600">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {counts.degraded}
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {counts.outage}
        </span>
        {counts.maintenance > 0 && (
          <span className="flex items-center gap-1 text-blue-600">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            {counts.maintenance}
          </span>
        )}
        {lastCheckedAt && (
          <span className="text-muted-foreground">
            · {t("header.lastChecked", { time: lastCheckedAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false }) })}
          </span>
        )}
        {shareUrl && (
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {t("embed.openFull")}
          </a>
        )}
      </div>

      {/* App rows */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <ul className="divide-y">
          {apps.map((app) => {
            const result = latestById[app.id];
            const statusPageUrl = toStatusPageUrl(app.statusUrl);
            return (
              <li key={app.id} className="flex items-center gap-2.5 px-3 py-2">
                <AppLogo src={app.logoUrl} alt={app.appName} className="h-6 w-6 shrink-0" />
                <div className="min-w-0 flex-1">
                  {statusPageUrl ? (
                    <a
                      href={statusPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-medium leading-tight hover:text-blue-600 hover:underline"
                    >
                      {app.appName}
                    </a>
                  ) : (
                    <span className="block truncate font-medium leading-tight">{app.appName}</span>
                  )}
                  {result?.incident && (
                    <p className="truncate text-[11px] text-muted-foreground" title={result.incident}>
                      {result.incident}
                    </p>
                  )}
                </div>
                <span className="hidden shrink-0 tabular-nums text-xs text-muted-foreground sm:inline">
                  {result?.responseTimeMs != null ? `${result.responseTimeMs} ms` : ""}
                </span>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 text-xs font-medium",
                    result ? STATUS_TEXT_CLASS[result.status] : "text-muted-foreground",
                  )}
                  title={result?.message ? localizeStatusMessage(result.message, t) : undefined}
                >
                  {result ? STATUS_ICON[result.status] : <CircleDashed className="h-3.5 w-3.5 animate-pulse" />}
                  {result ? t(`status.${result.status}`) : "…"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
