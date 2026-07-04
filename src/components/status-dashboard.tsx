"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  CircleDashed,
  Download,
  Frame,
  History,
  ExternalLink,
  HelpCircle,
  LayoutGrid,
  Link2,
  Loader2,
  Moon,
  MoreHorizontal,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { AddAppDialog } from "@/components/add-app-dialog";
import { AppLogo } from "@/components/app-logo";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { QuickSetupDialog } from "@/components/quick-setup-dialog";
import { ShareImportDialog } from "@/components/share-import-dialog";
import { useTranslation } from "@/lib/i18n/use-translation";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/locales";
import { buildEmbedUrl, buildShareUrl, decodeSharePayload, parseShareHash } from "@/lib/share";
import {
  fetchStatusBatched,
  localizeStatusMessage,
  STATUS_TEXT_CLASS,
  toStatusPageUrl,
} from "@/lib/status-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { resolveStatusUrl, VENDOR_BLACKLIST } from "@/types";
import { normalizeVendorName } from "@/lib/status-discovery";
import { guardOutboundUrl } from "@/lib/url-guard";
import type {
  AppHealthStatus,
  CheckType,
  HealthCheckResponse,
  HealthCheckResult,
  PingRecord,
  RegisteredApp,
} from "@/types";

const APPS_KEY = "jira-marketplace-apps";
const HISTORY_KEY = "jira-marketplace-history";
const LATEST_KEY = "jira-marketplace-latest";
const LAST_CHECKED_KEY = "jira-marketplace-last-checked";
const NOTIF_ENABLED_KEY = "jira-marketplace-notifications";
const REFRESH_INTERVAL_KEY = "jira-marketplace-refresh-interval";
const SEEDED_KEY = "jira-marketplace-seeded";

const REFRESH_OPTIONS = [
  { ms: 0,           label: "Off" },
  { ms: 60_000,      label: "1m"  },
  { ms: 5 * 60_000,  label: "5m"  },
  { ms: 15 * 60_000, label: "15m" },
] as const;
const HISTORY_MAX = 30;
const RECHECK_COOLDOWN_MS = 90_000; // skip initial scan if last check was < 90 s ago
const BAR_COUNT = 30;

interface StatusToast {
  id: string;
  appName: string;
  from: AppHealthStatus;
  to: AppHealthStatus;
}

const STATUS_PRIORITY: Record<AppHealthStatus, number> = {
  outage: 0,
  degraded: 1,
  maintenance: 2,
  operational: 3,
};

type SortKey = "appName" | "vendorName" | "status" | "responseTimeMs" | "checkedAt";
type SortDir = "asc" | "desc";

// A percentage over 1–2 samples is misleading — hide it until we have enough.
const MIN_UPTIME_SAMPLES = 3;

function uptimePct(history: PingRecord[]): number | null {
  if (history.length < MIN_UPTIME_SAMPLES) return null;
  // Industry convention: degraded still counts as "up" — the service responds.
  const up = history.filter((r) => r.status !== "outage").length;
  return Math.round((up / history.length) * 100);
}


// ── Heartbeat bars ─────────────────────────────────────────────────────────────
// Uses native `title` tooltip to avoid nested-interactive-element issues.

const HeartbeatBars = memo(function HeartbeatBars({ history }: { history: PingRecord[] }) {
  const { t, locale } = useTranslation();
  const slots = useMemo(() => {
    const filled = history.slice(-BAR_COUNT);
    const emptyCount = BAR_COUNT - filled.length;
    return [
      ...Array.from<null>({ length: emptyCount }).fill(null),
      ...filled,
    ] as (PingRecord | null)[];
  }, [history]);

  return (
    <div className="flex items-center gap-px">
      {slots.map((record, idx) => {
        const tip = record
          ? [
              t(`status.${record.status}`),
              new Date(record.timestamp).toLocaleString(locale),
              record.responseTimeMs != null ? `${record.responseTimeMs} ms` : null,
              record.message ? localizeStatusMessage(record.message, t) : null,
            ]
              .filter(Boolean)
              .join("\n")
          : t("history.noData");

        return (
          <span
            key={idx}
            title={tip}
            className={cn(
              "block h-7 w-1 rounded-[2px] cursor-default transition-opacity hover:opacity-60",
              record === null
                ? "bg-slate-200 dark:bg-slate-800"
                : record.status === "operational"
                  ? "bg-emerald-500"
                  : record.status === "degraded"
                    ? "bg-amber-400"
                    : record.status === "maintenance"
                      ? "bg-blue-400"
                      : "bg-red-500",
            )}
          />
        );
      })}
    </div>
  );
});

// ── Status indicator cell ──────────────────────────────────────────────────────

function StatusCell({
  result,
  isUnconfigured,
  isAdding,
}: {
  result: HealthCheckResult | undefined;
  isUnconfigured?: boolean;
  isAdding?: boolean;
}) {
  const { t, locale } = useTranslation();
  if (isUnconfigured) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground/50">
        <CircleDashed className="h-4 w-4" />
        <span className="text-xs">{t("table.noStatusPage")}</span>
      </div>
    );
  }
  if (isAdding && !result) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">…</span>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <CircleDashed className="h-4 w-4" />
        <span className="text-xs">…</span>
      </div>
    );
  }

  const { status, message, incident, upcomingMaintenance } = result;
  const isError = status !== "operational" && Boolean(message?.trim());

  const indicator = {
    operational: (
      <div className="flex items-center gap-2 text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      </div>
    ),
    degraded: (
      <div className="flex items-center gap-2 text-amber-600">
        <CircleDashed className="h-4 w-4" />
        <span className="h-2 w-2 rounded-full bg-amber-400" />
      </div>
    ),
    outage: (
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-4 w-4" />
        <span className="h-2 w-2 rounded-full bg-red-500" />
      </div>
    ),
    maintenance: (
      <div className="flex items-center gap-2 text-blue-600">
        <Wrench className="h-4 w-4" />
        <span className="h-2 w-2 rounded-full bg-blue-400" />
      </div>
    ),
  }[status];

  const label = t(`status.${status}`);

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {indicator}
        {isError ? (
          // Popover with openOnHover: hover on desktop, tap on touch devices —
          // a plain Tooltip has no touch affordance at all.
          <Popover>
            <PopoverTrigger
              openOnHover
              delay={150}
              className={cn(
                "cursor-help inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
                status === "outage"
                  ? "bg-red-100 text-red-700"
                  : status === "maintenance"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700",
              )}
            >
              {label} ⓘ
            </PopoverTrigger>
            <PopoverContent
              side="right"
              className="w-auto max-w-xs bg-foreground p-0 px-3 py-1.5 text-xs text-background ring-0"
            >
              <div className="space-y-1">
                {message && <p>{localizeStatusMessage(message, t)}</p>}
                {incident && incident !== message && <p>{incident}</p>}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <span
            className={cn(
              "text-xs font-medium",
              status === "operational" && "text-emerald-700",
              status === "degraded" && "text-amber-700",
              status === "outage" && "text-red-700",
              status === "maintenance" && "text-blue-700",
            )}
          >
            {label}
          </span>
        )}
      </div>
      {/* Active incident headline — "Degraded" alone vs "Degraded — API latency
          in EU region" are worlds apart when triaging. Full text in the popover. */}
      {incident && (
        <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground" title={incident}>
          {incident}
        </p>
      )}
      {/* Upcoming maintenance window announced by the vendor */}
      {!incident && upcomingMaintenance && (
        <p
          className="mt-0.5 flex items-center gap-1 truncate text-[11px] leading-tight text-blue-600/90"
          title={`${upcomingMaintenance.name} — ${new Date(upcomingMaintenance.scheduledFor).toLocaleString(locale)}`}
        >
          <CalendarClock className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {t("maintenance.upcoming")} · {new Date(upcomingMaintenance.scheduledFor).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </p>
      )}
    </div>
  );
}

// ── Sortable column header ─────────────────────────────────────────────────────

function SortableHead({
  label,
  sortKey,
  active,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = active === sortKey;
  return (
    <TableHead
      className={cn("cursor-pointer select-none group whitespace-nowrap", className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          dir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-25 group-hover:opacity-60 transition-opacity" />
        )}
      </div>
    </TableHead>
  );
}

// ── App table row ──────────────────────────────────────────────────────────────

const AppRow = memo(function AppRow({
  app,
  result,
  history,
  onDelete,
  dimmed = false,
  isAdding = false,
}: {
  app: RegisteredApp;
  result: HealthCheckResult | undefined;
  history: PingRecord[];
  onDelete: (app: RegisteredApp) => void;
  dimmed?: boolean;
  isAdding?: boolean;
}) {
  const { locale } = useTranslation();
  const pct = uptimePct(history);
  const statusPageUrl = toStatusPageUrl(app.statusUrl);
  return (
    <TableRow className={cn("group/row", dimmed && "opacity-50")}>
      {/* App — truncates to fill remaining space */}
      <TableCell className="min-w-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppLogo src={app.logoUrl} alt={app.appName} className="h-8 w-8 shrink-0" />
          {statusPageUrl ? (
            <a
              href={statusPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link flex min-w-0 items-center gap-1 text-sm font-medium leading-tight transition-colors hover:text-blue-600"
            >
              <span className="truncate">{app.appName}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" />
            </a>
          ) : (
            <span className="truncate text-sm font-medium leading-tight">{app.appName}</span>
          )}
        </div>
      </TableCell>
      {/* Vendor — visible from md */}
      <TableCell className="hidden md:table-cell">
        <span className="block truncate text-sm text-muted-foreground">{app.vendorName}</span>
      </TableCell>
      {/* Status */}
      <TableCell>
        <StatusCell result={result} isUnconfigured={!app.statusUrl} isAdding={isAdding} />
      </TableCell>
      {/* History — visible from lg */}
      <TableCell className="hidden lg:table-cell">
        <div className="flex items-center gap-3">
          <HeartbeatBars history={history} />
          {pct !== null && (
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {pct}%
            </span>
          )}
        </div>
      </TableCell>
      {/* Response — visible from lg */}
      <TableCell className="hidden lg:table-cell pl-6 tabular-nums text-sm text-muted-foreground">
        {result?.responseTimeMs != null ? `${result.responseTimeMs} ms` : "—"}
      </TableCell>
      {/* Checked — visible from xl */}
      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
        {result?.checkedAt ? new Date(result.checkedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "—"}
      </TableCell>
      {/* Delete — always visible, faint until hover */}
      <TableCell className="w-12 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-40 transition-opacity group-hover/row:opacity-100"
          onClick={() => onDelete(app)}
          aria-label={`Remove ${app.appName}`}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

// Re-resolve statusUrl + checkType for every stored app against the current
// PRODUCT_RULES / VENDOR_STATUS_MAP. This silently fixes stale localStorage
// data (e.g. old draw.io summary.json URL) when the user revisits after a
// vendor-map update, without requiring a manual reset.
function migrateApps(prev: RegisteredApp[]): RegisteredApp[] {
  let changed = false;
  const migrated = prev.map((app) => {
    const normalizedVendor = normalizeVendorName(app.vendorName);
    if (VENDOR_BLACKLIST.has(normalizedVendor)) {
      if (app.statusUrl !== "" || app.checkType !== "custom") {
        changed = true;
        return { ...app, statusUrl: "", checkType: "custom" as const };
      }
      return app;
    }
    const resolved = resolveStatusUrl(app.appName, normalizedVendor);
    if (
      resolved &&
      (resolved.statusUrl !== app.statusUrl || resolved.checkType !== app.checkType)
    ) {
      changed = true;
      return { ...app, statusUrl: resolved.statusUrl, checkType: resolved.checkType };
    }
    return app;
  });
  return changed ? migrated : prev;
}

// `useIsMounted` returns false on the server (and during the very first
// client render to keep SSR + initial client output identical), then true
// after hydration. Implemented with useSyncExternalStore so we avoid the
// setState-in-effect pattern.
const subscribeNoop = () => () => {};
const isMountedClient = () => true;
const isMountedServer = () => false;
function useIsMounted(): boolean {
  return useSyncExternalStore(subscribeNoop, isMountedClient, isMountedServer);
}

// Theme helpers (replaces standalone ThemeToggle component)
const subscribeToTheme = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};
const getThemeSnapshot = () => document.documentElement.classList.contains("dark");
const getThemeServerSnapshot = () => false;

// ── Main dashboard ─────────────────────────────────────────────────────────────

export function StatusDashboard() {
  const { t, locale, setLocale } = useTranslation();
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getThemeServerSnapshot);
  const toggleTheme = useCallback(() => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* ignore */ }
  }, [isDark]);
  // ── State ──────────────────────────────────────────────────────────────────
  // `isMounted` is false on the server and on the very first client render.
  // All localStorage-derived values are hidden until it becomes true, so the
  // SSR HTML and the initial client render are identical — no hydration mismatch.
  const isMounted = useIsMounted();

  // Lazy initializers still correctly pre-populate state from localStorage on
  // the client; we just don't *render* that data until after hydration.
  const [apps, setApps] = useState<RegisteredApp[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(APPS_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as RegisteredApp[];
        if (Array.isArray(parsed)) return migrateApps(parsed);
      }
    } catch {
      localStorage.removeItem(APPS_KEY);
    }
    return [];
  });

  const [historyById, setHistoryById] = useState<Record<string, PingRecord[]>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) return JSON.parse(raw) as Record<string, PingRecord[]>;
    } catch {
      localStorage.removeItem(HISTORY_KEY);
    }
    return {};
  });
  const [latestById, setLatestById] = useState<Record<string, HealthCheckResult>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(LATEST_KEY);
      if (raw) return JSON.parse(raw) as Record<string, HealthCheckResult>;
    } catch {
      localStorage.removeItem(LATEST_KEY);
    }
    return {};
  });
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const isCheckingRef = useRef(false);
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  // Auto-open onboarding on first visit (no apps stored yet). Lazy initializer
  // reads localStorage so the dialog renders open immediately after hydration —
  // no setState-in-effect needed.
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(APPS_KEY);
      if (raw === null) return true;
      const parsed = JSON.parse(raw) as RegisteredApp[];
      return Array.isArray(parsed) && parsed.length === 0;
    } catch {
      return true;
    }
  });
  const [deleteTarget, setDeleteTarget] = useState<RegisteredApp | null>(null);
  const [toasts, setToasts] = useState<StatusToast[]>([]);
  const [notices, setNotices] = useState<{ id: string; message: string; variant?: "success" | "error" }[]>([]);
  // Lazy-restored from localStorage; its render usage is isMounted-gated so
  // the server (null) vs client (Date) difference never causes a mismatch.
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(LAST_CHECKED_KEY);
      return raw ? new Date(raw) : null;
    } catch {
      return null;
    }
  });
  const [shareImportApps, setShareImportApps] = useState<RegisteredApp[] | null>(null);
  // Browser-only values use lazy initializers (not post-mount effects): the
  // values they influence render inside popovers/`isMounted` gates, so the
  // SSR-vs-client difference never reaches hydrated DOM.
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(() =>
    typeof window === "undefined" || typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission,
  );
  const [notifEnabled, setNotifEnabled] = useState(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return false;
    return Notification.permission === "granted" && localStorage.getItem(NOTIF_ENABLED_KEY) !== "false";
  });
  const [refreshMs, setRefreshMsState] = useState<number>(() => {
    if (typeof window === "undefined") return 5 * 60_000;
    const stored = localStorage.getItem(REFRESH_INTERVAL_KEY);
    if (stored !== null) {
      const parsed = Number(stored);
      if (REFRESH_OPTIONS.some((o) => o.ms === parsed)) return parsed;
    }
    return 5 * 60_000;
  });
  const [atlassianStatus, setAtlassianStatus] = useState<{
    overallIndicator: "none" | "minor" | "major" | "critical";
    products: Array<{ name: string; indicator: "none" | "minor" | "major" | "critical"; description: string }>;
  } | null>(null);

  const setRefreshMs = useCallback((ms: number) => {
    setRefreshMsState(ms);
    localStorage.setItem(REFRESH_INTERVAL_KEY, String(ms));
  }, []);

  const toggleNotif = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    if (notifPerm === "default") {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      if (perm === "granted") {
        setNotifEnabled(true);
        localStorage.setItem(NOTIF_ENABLED_KEY, "true");
      }
    } else if (notifPerm === "granted") {
      const next = !notifEnabled;
      setNotifEnabled(next);
      localStorage.setItem(NOTIF_ENABLED_KEY, String(next));
    }
  }, [notifPerm, notifEnabled]);

  // Use a ref so async callbacks always read the latest apps value
  const appsRef = useRef(apps);
  useEffect(() => {
    appsRef.current = apps;
  }, [apps]);

  // ── Persist ────────────────────────────────────────────────────────────────
  // No hydration effect needed — lazy initializers above handle the first load.

  useEffect(() => {
    localStorage.setItem(APPS_KEY, JSON.stringify(apps));
  }, [apps]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historyById));
  }, [historyById]);

  useEffect(() => {
    localStorage.setItem(LATEST_KEY, JSON.stringify(latestById));
  }, [latestById]);

  useEffect(() => {
    if (lastCheckedAt) {
      try { localStorage.setItem(LAST_CHECKED_KEY, lastCheckedAt.toISOString()); } catch { /* ignore */ }
    }
  }, [lastCheckedAt]);

  const addNotice = useCallback((message: string, variant: "success" | "error" = "success") => {
    const id = crypto.randomUUID();
    setNotices((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setNotices((prev) => prev.filter((n) => n.id !== id)), variant === "error" ? 5000 : 3000);
  }, []);

  // ── Share-via-URL ──────────────────────────────────────────────────────────
  // Runs on mount AND on hashchange — navigating to a #share= URL in an
  // already-open tab changes only the hash (no reload), so a mount-only check
  // would silently miss it.
  useEffect(() => {
    const handleShareHash = () => {
      const payload = parseShareHash();
      if (!payload) return;
      // Strip the hash immediately so refreshing doesn't re-trigger the dialog
      history.replaceState(null, "", window.location.pathname + window.location.search);
      void decodeSharePayload(payload).then((decoded) => {
        if (decoded && decoded.length > 0) setShareImportApps(decoded);
        // Corrupt/truncated payload (links often get cut in messengers/mail) —
        // tell the user instead of silently doing nothing.
        else addNotice(t("share.invalid"), "error");
      });
    };
    handleShareHash();
    window.addEventListener("hashchange", handleShareHash);
    return () => window.removeEventListener("hashchange", handleShareHash);
  }, [addNotice, t]);

  const handleShare = useCallback(() => {
    void buildShareUrl(apps).then((url) =>
      navigator.clipboard.writeText(url).then(() => addNotice(t("share.copied"))),
    );
  }, [apps, t, addNotice]);

  const handleCopyEmbed = useCallback(() => {
    void buildEmbedUrl(apps).then((url) =>
      navigator.clipboard.writeText(url).then(() => addNotice(t("share.embedCopied"))),
    );
  }, [apps, t, addNotice]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (appName: string, from: AppHealthStatus, to: AppHealthStatus) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev.slice(-4), { id, appName, from, to }]);
      setTimeout(() => dismissToast(id), 6000);

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        notifEnabled
      ) {
        const body =
          to === "outage"
            ? t("notification.outage", { appName })
            : to === "degraded"
            ? t("notification.degraded", { appName })
            : to === "maintenance"
            ? t("notification.maintenance", { appName })
            : t("notification.recovered", { appName });
        try { new Notification(appName, { body, icon: "/favicon.svg" }); } catch { /* ignore */ }
      }
    },
    [dismissToast, notifEnabled, t],
  );

  // ── Health checks ──────────────────────────────────────────────────────────

  // Write-through companion to `latestById`: updated synchronously at every
  // place the state is set, so async callbacks always read the freshest
  // snapshot. Replaces the old state→ref mirroring effect.
  const latestByIdRef = useRef(latestById);

  const applyResults = useCallback((results: HealthCheckResult[]) => {
    const prevById = latestByIdRef.current;

    // Detect status degradations → show toast
    for (const r of results) {
      const prev = prevById[r.appId];
      if (prev && prev.status !== r.status) {
        const appName = appsRef.current.find((a) => a.id === r.appId)?.appName ?? r.appId;
        addToast(appName, prev.status, r.status);
      }
    }

    // Self-healing: persist any auto-discovered URL replacements to localStorage
    const healed = results.filter((r) => r.updatedStatusUrl);
    if (healed.length > 0) {
      setApps((prev) =>
        prev.map((app) => {
          const fix = healed.find((r) => r.appId === app.id);
          if (!fix?.updatedStatusUrl) return app;
          return {
            ...app,
            statusUrl: fix.updatedStatusUrl,
            checkType: fix.updatedCheckType ?? app.checkType,
          };
        }),
      );
    }

    const nextLatest = {
      ...prevById,
      ...Object.fromEntries(results.map((r) => [r.appId, r])),
    };
    latestByIdRef.current = nextLatest;
    setLatestById(nextLatest);
    setHistoryById((prev) => {
      const next = { ...prev };
      for (const r of results) {
        const record: PingRecord = {
          status: r.status,
          timestamp: r.checkedAt,
          responseTimeMs: r.responseTimeMs,
          message: r.message,
        };
        next[r.appId] = [...(next[r.appId] ?? []), record].slice(-HISTORY_MAX);
      }
      return next;
    });
  }, [addToast]);

  const handleShareImport = useCallback((incoming: RegisteredApp[]) => {
    // Defang URLs that fail the SSRF guard — a malicious link can hide an
    // arbitrary target behind a familiar app name. The app is still imported,
    // just without monitoring.
    const sanitized = incoming.map((a) =>
      a.statusUrl && !guardOutboundUrl(a.statusUrl).ok
        ? { ...a, statusUrl: "", checkType: "custom" as const }
        : a,
    );
    const existingNames = new Set(appsRef.current.map((a) => a.appName.toLowerCase()));
    const fresh = sanitized.filter((a) => !existingNames.has(a.appName.toLowerCase()));
    const skipped = incoming.length - fresh.length;
    const message =
      skipped > 0
        ? t("share.importDuplicate", { added: fresh.length, skipped })
        : t("share.importSuccess", { count: fresh.length });

    setApps((prev) => [...prev, ...fresh]);
    addNotice(message);
    setShareImportApps(null);

    // Auto-check imported apps (same pattern as handleBulkAddApps)
    const checkable = fresh.filter((a) => a.statusUrl);
    if (checkable.length === 0) return;
    const ids = checkable.map((a) => a.id);
    setAddingIds((prev) => new Set([...prev, ...ids]));
    void fetchStatusBatched(checkable)
      .then((data) => { if (data?.results) applyResults(data.results); })
      .catch(() => undefined)
      .finally(() => {
        setAddingIds((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
      });
  }, [t, addNotice, applyResults]);

  // Update browser tab title to reflect issue count
  useEffect(() => {
    const issueCount = Object.values(latestById).filter(
      (r) => r.status === "degraded" || r.status === "outage",
    ).length;
    document.title = issueCount > 0
      ? `⚠ ${issueCount} | Marketplace App Status`
      : "Marketplace App Status";
  }, [latestById]);

  const checkAllStatuses = async () => {
    if (isCheckingRef.current) return;
    const appsList = appsRef.current;
    const checkableApps = appsList.filter((a) => a.statusUrl);
    if (checkableApps.length === 0) return;
    isCheckingRef.current = true;
    setIsChecking(true);
    try {
      const data = await fetchStatusBatched(checkableApps);
      if (!data) throw new Error("All batches failed");
      applyResults(data.results);
      setLastCheckedAt(new Date());
    } catch {
      const prev = latestByIdRef.current;
      const next = { ...prev };
      let changed = false;
      for (const app of checkableApps) {
        // Only mark as outage if the app had a previous result.
        // Brand-new apps (no prior result) stay unknown — avoids false outages
        // on first add when the check request fails (e.g. cold start / timeout).
        if (prev[app.id] && !addingIds.has(app.id)) {
          changed = true;
          next[app.id] = {
            ...prev[app.id],
            status: "outage",
            checkedAt: new Date().toISOString(),
            responseTimeMs: null,
            message: "Health check request failed",
          };
        }
      }
      if (changed) {
        latestByIdRef.current = next;
        setLatestById(next);
      }
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  };

  // (Migration of stored apps now happens inline in the lazy useState
  // initializer above; see migrateApps().)

  // Multi-tab sync — re-read localStorage when another tab writes to our keys.
  // The `storage` event only fires in OTHER tabs/windows, not the current one,
  // so there is no risk of an update loop with the persist effects above.
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === APPS_KEY && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue) as RegisteredApp[];
          if (Array.isArray(parsed)) setApps(parsed);
        } catch { /* ignore corrupt data */ }
      }
      if (e.key === HISTORY_KEY && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue) as Record<string, PingRecord[]>;
          setHistoryById(parsed);
        } catch { /* ignore corrupt data */ }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Initial health check fires after mount, but is skipped if a check ran
  // recently (e.g. user navigated away and back quickly). Cached results from
  // localStorage are shown immediately while the user waits. The check is
  // deferred a microtask so the spinner setState never lands inside the
  // effect's synchronous phase (no cascading render).
  useEffect(() => {
    if (!isMounted) return;
    try {
      const raw = localStorage.getItem(LAST_CHECKED_KEY);
      if (raw && Date.now() - new Date(raw).getTime() < RECHECK_COOLDOWN_MS) return;
    } catch { /* ignore */ }
    void Promise.resolve().then(checkAllStatuses);
    // checkAllStatuses reads everything through refs — intentionally not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  // (Onboarding auto-open is handled by the lazy initializer of `onboardingOpen`
  // above — no effect needed.)

  // Auto-refresh at the user-selected interval. checkAllStatuses is intentionally
  // omitted from deps — it captures a stable ref internally.
  useEffect(() => {
    if (!isMounted || refreshMs === 0) return;
    const id = setInterval(() => void checkAllStatuses(), refreshMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, refreshMs]);

  // Catch-up check when the tab becomes visible again — browsers throttle or
  // freeze background-tab timers, so the interval above can silently stop
  // firing. If the last check is older than the refresh interval (or never
  // happened), run one immediately.
  useEffect(() => {
    if (!isMounted || refreshMs === 0) return;
    const handleVisible = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const raw = localStorage.getItem(LAST_CHECKED_KEY);
        if (raw && Date.now() - new Date(raw).getTime() < refreshMs) return;
      } catch { /* fall through to check */ }
      void checkAllStatuses();
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, refreshMs]);

  // Seed popular apps on first visit — use a dedicated flag so the APPS_KEY
  // persistence effect (which writes "[]" immediately) doesn't block seeding.
  // Skip seeding when the URL contains a share payload — the share import will
  // populate the list instead, and we don't want default apps mixed in.
  useEffect(() => {
    if (!isMounted) return;
    if (localStorage.getItem(SEEDED_KEY) !== null) return;
    localStorage.setItem(SEEDED_KEY, "1");
    if (window.location.hash.includes("#share=")) return;
    fetch("/api/marketplace/popular")
      .then((r) => r.json())
      .then(({ apps: popular }: { apps: Array<{ id: string; appName: string; vendorName: string; checkType: import("@/types").CheckType; statusUrl: string; logoUrl?: string }> }) => {
        const defaults = popular
          .filter((a) => a.statusUrl !== "")
          .slice(0, 6)
          .map(({ id, appName, vendorName, checkType, statusUrl, logoUrl }) => ({
            id, appName, vendorName, checkType, statusUrl, logoUrl,
          }));
        if (defaults.length === 0) return;
        setApps(defaults);
        // Kick off the first status check right away. The mount-time initial
        // check already ran with an empty app list (seeding is async), so
        // without this the seeded rows would spin until the next manual or
        // interval refresh.
        const ids = defaults.map((a) => a.id);
        setAddingIds((prev) => new Set([...prev, ...ids]));
        void fetchStatusBatched(defaults)
          .then((data) => {
            if (data?.results) {
              applyResults(data.results);
              setLastCheckedAt(new Date());
            }
          })
          .catch(() => undefined)
          .finally(() => {
            setAddingIds((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
          });
      })
      .catch(() => { /* ignore */ });
    // Re-runs when applyResults' identity changes are no-ops: the SEEDED_KEY
    // guard above bails out immediately.
  }, [isMounted, applyResults]);

  // Fetch Atlassian platform status on mount and on auto-refresh interval
  useEffect(() => {
    if (!isMounted) return;
    const doFetch = () => {
      fetch("/api/atlassian-platform")
        .then((r) => r.json())
        .then((data) => { if (data && !data.error) setAtlassianStatus(data); })
        .catch(() => { /* ignore */ });
    };
    doFetch();
    if (refreshMs === 0) return;
    const id = setInterval(doFetch, refreshMs);
    return () => clearInterval(id);
  }, [isMounted, refreshMs]);

  // ── Sort ───────────────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    setSortDir((prev) => (sortKey === key ? (prev === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(key);
  };

  // ── App CRUD ───────────────────────────────────────────────────────────────
  const handleAddApp = (app: RegisteredApp) => {
    setApps((prev) => [app, ...prev]);
    if (!app.statusUrl) return;
    setAddingIds((prev) => new Set([...prev, app.id]));

    const doCheck = () =>
      fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apps: [app] }),
      })
        .then((r) => (r.ok ? (r.json() as Promise<HealthCheckResponse>) : null))
        .catch(() => null);

    void doCheck()
      .then((data) => {
        const result = data?.results?.[0];
        if (result) {
          applyResults(data!.results);
          // Cold-start may produce a false outage/degraded — silently recheck
          // after 10 s without showing a spinner.
          if (result.status === "outage" || result.status === "degraded") {
            setTimeout(() => {
              void doCheck().then((retryData) => {
                if (retryData?.results?.[0]) applyResults(retryData.results);
              });
            }, 10_000);
          }
        }
      })
      .finally(() => {
        setAddingIds((prev) => { const n = new Set(prev); n.delete(app.id); return n; });
      });
  };

  const handleBulkAddApps = (newApps: RegisteredApp[]) => {
    if (newApps.length === 0) return;
    setApps((prev) => {
      const incomingById = new Map(newApps.map((a) => [a.id, a]));
      const next = prev.map((a) => {
        const upd = incomingById.get(a.id);
        return upd ? { ...a, ...upd } : a;
      });
      const prevIds = new Set(prev.map((a) => a.id));
      const brandNew = newApps.filter((a) => !prevIds.has(a.id));
      return brandNew.length > 0 || next.some((a, i) => a !== prev[i])
        ? [...brandNew, ...next]
        : prev;
    });
    const checkableApps = newApps.filter((a) => a.statusUrl);
    if (checkableApps.length > 0) {
      const ids = checkableApps.map((a) => a.id);
      setAddingIds((prev) => new Set([...prev, ...ids]));
      void fetchStatusBatched(checkableApps)
        .then((data) => { if (data?.results) applyResults(data.results); })
        .catch(() => undefined)
        .finally(() => {
          setAddingIds((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
        });
    }
  };

  const handleDeleteApp = useCallback((appId: string) => {
    setApps((prev) => prev.filter((a) => a.id !== appId));
    const nextLatest = { ...latestByIdRef.current };
    delete nextLatest[appId];
    latestByIdRef.current = nextLatest;
    setLatestById(nextLatest);
    setHistoryById((prev) => { const n = { ...prev }; delete n[appId]; return n; });
  }, []);

  const handleRequestDelete = useCallback((app: RegisteredApp) => {
    setDeleteTarget(app);
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), apps }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jira-apps-status-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [apps]);

  // Restore an exported JSON backup. Accepts the export shape
  // ({ exportedAt, apps: [...] }) or a bare RegisteredApp[] array. Every entry
  // is re-validated: appName required, statusUrl must pass the SSRF guard
  // (defanged to unmonitored otherwise), checkType whitelisted.
  const importInputRef = useRef<HTMLInputElement>(null);
  const VALID_CHECK_TYPES = new Set<string>(["statuspage_api", "http_ping", "custom"]);
  const handleImportFile = (file: File) => {
    void file
      .text()
      .then((text) => {
        const parsed = JSON.parse(text) as unknown;
        const rawApps = Array.isArray(parsed)
          ? parsed
          : (parsed as { apps?: unknown[] } | null)?.apps;
        if (!Array.isArray(rawApps)) throw new Error("not an app list");
        const imported: RegisteredApp[] = rawApps.flatMap((entry) => {
          const a = entry as Partial<RegisteredApp>;
          if (typeof a.appName !== "string" || a.appName.trim() === "") return [];
          const statusUrl =
            typeof a.statusUrl === "string" && guardOutboundUrl(a.statusUrl).ok
              ? a.statusUrl
              : "";
          return [{
            id: typeof a.id === "string" && a.id !== "" ? a.id : crypto.randomUUID(),
            appName: a.appName,
            vendorName: typeof a.vendorName === "string" ? a.vendorName : "",
            statusUrl,
            checkType: !statusUrl
              ? ("custom" as CheckType)
              : VALID_CHECK_TYPES.has(a.checkType as string)
                ? (a.checkType as CheckType)
                : "statuspage_api",
            ...(typeof a.logoUrl === "string" ? { logoUrl: a.logoUrl } : {}),
          }];
        });
        if (imported.length === 0) throw new Error("no valid apps");
        handleBulkAddApps(imported);
        addNotice(t("share.importSuccess", { count: imported.length }));
      })
      .catch(() => addNotice(t("import.fileInvalid"), "error"));
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const existingIds = useMemo(() => new Set(apps.map((a) => a.id)), [apps]);
  const existingNames = useMemo(() => new Set(apps.map((a) => a.appName.toLowerCase())), [apps]);

  const summary = useMemo(() => {
    const vals = Object.values(latestById);
    return {
      operational: vals.filter((r) => r.status === "operational").length,
      degraded: vals.filter((r) => r.status === "degraded").length,
      outage: vals.filter((r) => r.status === "outage").length,
      maintenance: vals.filter((r) => r.status === "maintenance").length,
    };
  }, [latestById]);

  const [unconfiguredOpen, setUnconfiguredOpen] = useState(false);

  // Status-transition events derived from ping history — toasts vanish, this
  // is the persistent record ("draw.io: Operational → Outage, 14:32").
  const timelineEvents = useMemo(() => {
    if (!timelineOpen) return [];
    const events: Array<{
      appId: string; appName: string; logoUrl?: string;
      from: AppHealthStatus; to: AppHealthStatus; timestamp: string; message?: string;
    }> = [];
    for (const app of apps) {
      const hist = historyById[app.id] ?? [];
      for (let i = 1; i < hist.length; i++) {
        if (hist[i].status !== hist[i - 1].status) {
          events.push({
            appId: app.id,
            appName: app.appName,
            logoUrl: app.logoUrl,
            from: hist[i - 1].status,
            to: hist[i].status,
            timestamp: hist[i].timestamp,
            message: hist[i].message,
          });
        }
      }
    }
    return events
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, 100);
  }, [timelineOpen, apps, historyById]);

  const { monitoredApps, unconfiguredApps } = useMemo(() => {
    const sorted = [...apps].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "appName":
          cmp = a.appName.localeCompare(b.appName);
          break;
        case "vendorName":
          cmp = a.vendorName.localeCompare(b.vendorName);
          break;
        case "status": {
          const aPri = STATUS_PRIORITY[latestById[a.id]?.status ?? "degraded"] ?? 3;
          const bPri = STATUS_PRIORITY[latestById[b.id]?.status ?? "degraded"] ?? 3;
          cmp = aPri - bPri;
          break;
        }
        case "responseTimeMs": {
          const aMs = latestById[a.id]?.responseTimeMs ?? Infinity;
          const bMs = latestById[b.id]?.responseTimeMs ?? Infinity;
          cmp = aMs - bMs;
          break;
        }
        case "checkedAt": {
          const aT = latestById[a.id]?.checkedAt
            ? new Date(latestById[a.id]!.checkedAt).getTime()
            : 0;
          const bT = latestById[b.id]?.checkedAt
            ? new Date(latestById[b.id]!.checkedAt).getTime()
            : 0;
          cmp = aT - bT;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return {
      monitoredApps: sorted.filter((a) => a.statusUrl),
      unconfiguredApps: sorted.filter((a) => !a.statusUrl),
    };
  }, [apps, latestById, sortKey, sortDir]);

  // The stored refresh interval is lazy-loaded on the client, but the label
  // renders in SSR HTML too — show the default until hydration completes so
  // server and first client paint stay identical.
  const displayRefreshMs = isMounted ? refreshMs : 5 * 60_000;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      {/* Toast container */}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-lg text-sm"
          >
            {toast.to === "operational" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : toast.to === "degraded" ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            ) : toast.to === "maintenance" ? (
              <Wrench className="h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            )}
            <div className="min-w-0">
              <span className="font-medium">{toast.appName}</span>
              <span className="ml-1.5 text-muted-foreground">
                <span className={STATUS_TEXT_CLASS[toast.from]}>{t(`status.${toast.from}`)}</span>
                {" → "}
                <span className={STATUS_TEXT_CLASS[toast.to]}>{t(`status.${toast.to}`)}</span>
              </span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-1 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {notices.map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-lg text-sm"
          >
            {n.variant === "error" ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            )}
            <span>{n.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {t("header.title")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("header.subtitle")}
            {isMounted && lastCheckedAt && (
              <span className="ml-2 text-xs">
                · {t("header.lastChecked", { time: lastCheckedAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) })}
              </span>
            )}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/70">
            {t("header.disclaimer")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh + interval split button */}
          <div className="flex items-center divide-x rounded-md border">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-none border-0"
              onClick={() => void checkAllStatuses()}
              disabled={isChecking}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isChecking && "animate-spin")} />
              <span className="hidden sm:inline">{t("header.refresh")}</span>
            </Button>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-l-none border-0 gap-1 px-2 text-xs text-muted-foreground"
                  >
                    {displayRefreshMs === 0 ? t("autoRefresh.off") : REFRESH_OPTIONS.find((o) => o.ms === displayRefreshMs)?.label ?? "5m"}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                }
              />
              <PopoverContent align="start" className="w-36 p-1.5">
                <p className="mb-1.5 px-1 text-xs text-muted-foreground">{t("autoRefresh.label")}</p>
                {REFRESH_OPTIONS.map(({ ms, label }) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => setRefreshMs(ms)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                      refreshMs === ms && "font-semibold",
                    )}
                  >
                    {ms === 0 ? t("autoRefresh.off") : label}
                    {refreshMs === ms && <span className="text-xs text-muted-foreground">●</span>}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Event timeline */}
          {isMounted && apps.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t("header.timeline")}
              onClick={() => setTimelineOpen(true)}
            >
              <History className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Share / Export / Import dropdown — Import must work with an empty
              list too (restoring a backup in a fresh browser), so the menu is
              always rendered; Share/Export are disabled without apps. */}
          {isMounted && (
            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("share.tooltip")}>
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <PopoverContent align="end" className="w-48 p-1">
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={apps.length === 0}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {t("share.tooltip")}
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={apps.length === 0}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {t("header.exportTooltip")}
                </button>
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Upload className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {t("header.importTooltip")}
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  onClick={handleCopyEmbed}
                  disabled={apps.length === 0}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Frame className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {t("share.embedTooltip")}
                </button>
              </PopoverContent>
            </Popover>
          )}
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = ""; // allow re-selecting the same file
            }}
          />

          <div className="h-4 w-px bg-border" />

          {/* Quick Setup + Add App */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickSetupOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("header.quickSetup")}</span>
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            {t("header.addApp")}
          </Button>

          <div className="h-4 w-px bg-border" />

          {/* More menu: How to use + Language + Theme */}
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              }
            />
            <PopoverContent align="end" className="w-44 p-1">
              {/* Notifications */}
              {notifPerm !== "unsupported" && (
                <button
                  type="button"
                  onClick={() => void toggleNotif()}
                  disabled={notifPerm === "denied"}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed",
                    notifPerm === "granted" && notifEnabled
                      ? "text-emerald-600"
                      : notifPerm === "denied"
                      ? "text-amber-500 opacity-60"
                      : "",
                  )}
                >
                  {notifPerm === "granted" && notifEnabled
                    ? <Bell className="h-3.5 w-3.5 shrink-0" />
                    : <BellOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  }
                  {notifPerm === "granted" && notifEnabled
                    ? t("notification.enabled")
                    : notifPerm === "granted" && !notifEnabled
                    ? t("notification.disabled")
                    : notifPerm === "denied"
                    ? t("notification.denied")
                    : t("notification.enable")}
                </button>
              )}

              {/* How to use */}
              <button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <HelpCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {t("header.howToUse")}
              </button>

              <div className="my-1 h-px bg-border" />

              {/* Language — standard list items */}
              {LOCALES.map((l: Locale) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                    locale === l && "font-semibold",
                  )}
                >
                  {LOCALE_LABELS[l]}
                  {locale === l && <span className="text-xs text-muted-foreground">●</span>}
                </button>
              ))}

              <div className="my-1 h-px bg-border" />

              {/* Theme */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                {isDark
                  ? <Sun className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  : <Moon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                }
                {isDark ? t("theme.toLight") : t("theme.toDark")}
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/*
        isMounted guard — everything below reads from localStorage-backed state.
        Rendering it before mount would produce a different output than the SSR
        HTML, causing a hydration mismatch.
        The skeleton is pure static markup that matches the server render exactly.
      */}
      {!isMounted ? (
        /* Loading skeleton — shown on server and on the very first client paint */
        <div className="animate-pulse space-y-3">
          {/* Badge row skeleton */}
          <div className="flex flex-wrap gap-2">
            {[96, 80, 72, 88].map((w) => (
              <div key={w} className={`h-6 rounded-full bg-muted`} style={{ width: w }} />
            ))}
          </div>
          {/* Table skeleton */}
          <div className="rounded-lg border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b px-4 py-3 last:border-0"
              >
                <div className="h-8 w-8 shrink-0 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-44 rounded bg-muted" />
                  <div className="h-2.5 w-28 rounded bg-muted" />
                </div>
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-7 w-[122px] rounded bg-muted" />
                <div className="h-3 w-14 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30">
              <CheckCircle2 className="h-3 w-3" />
              {t("status.operational")}
              <span className="ml-0.5 font-bold">{summary.operational}</span>
            </Badge>
            <Badge className="gap-1.5 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/30">
              <CircleDashed className="h-3 w-3" />
              {t("status.degraded")}
              <span className="ml-0.5 font-bold">{summary.degraded}</span>
            </Badge>
            <Badge className="gap-1.5 bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30">
              <AlertTriangle className="h-3 w-3" />
              {t("status.outage")}
              <span className="ml-0.5 font-bold">{summary.outage}</span>
            </Badge>
            {/* Maintenance badge only when relevant — usually zero */}
            {summary.maintenance > 0 && (
              <Badge className="gap-1.5 bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30">
                <Wrench className="h-3 w-3" />
                {t("status.maintenance")}
                <span className="ml-0.5 font-bold">{summary.maintenance}</span>
              </Badge>
            )}
            <Badge variant="outline" className="text-muted-foreground">
              {t("status.monitored", { n: apps.length })}
            </Badge>
          </div>

          {/* Atlassian Platform status */}
          {atlassianStatus && (() => {
            const ind = atlassianStatus.overallIndicator;
            const isOk = ind === "none";
            const isCritical = ind === "critical";
            const affectedProducts = atlassianStatus.products.filter((p) => p.indicator !== "none");
            return (
              <div className={cn(
                "mb-4 rounded-lg border px-4 py-3",
                isOk
                  ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : isCritical
                  ? "border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20"
                  : "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20",
              )}>
                {/* Header row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      isOk ? "bg-emerald-500" : isCritical ? "bg-red-500" : "bg-amber-500",
                    )} />
                    <span className="text-sm font-medium">{t("atlassian.label")}</span>
                    <span className={cn(
                      "text-sm",
                      isOk ? "text-emerald-700 dark:text-emerald-400"
                      : isCritical ? "text-red-700 dark:text-red-400"
                      : "text-amber-700 dark:text-amber-400",
                    )}>
                      {isOk ? "— All Systems Operational" : `— ${affectedProducts.length} service${affectedProducts.length > 1 ? "s" : ""} affected`}
                    </span>
                  </div>
                  <a
                    href="https://status.atlassian.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-muted-foreground hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    status.atlassian.com
                  </a>
                </div>

                {/* Affected product pills */}
                {affectedProducts.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-inherit pt-2.5">
                    {affectedProducts.map((p) => (
                      <span
                        key={p.name}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          p.indicator === "critical"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                        )}
                      >
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          p.indicator === "critical" ? "bg-red-500" : "bg-amber-500",
                        )} />
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Table or empty state */}
          {apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-20 text-center">
              <LayoutGrid className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-base font-semibold">{t("empty.title")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("empty.body")}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button onClick={() => setQuickSetupOpen(true)}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  {t("header.quickSetup")}
                </Button>
                <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  {t("header.addApp")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    {/* App — takes all remaining space */}
                    <SortableHead
                      label={t("table.app")}
                      sortKey="appName"
                      active={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    {/* Vendor — md+ */}
                    <SortableHead
                      label={t("table.vendor")}
                      sortKey="vendorName"
                      active={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                      className="hidden md:table-cell w-[18%]"
                    />
                    {/* Status */}
                    <SortableHead
                      label={t("table.status")}
                      sortKey="status"
                      active={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                      className="w-36"
                    />
                    {/* History — lg+ */}
                    <TableHead className="hidden lg:table-cell w-[200px]">
                      {t("table.history", { n: BAR_COUNT })}
                    </TableHead>
                    {/* Response — lg+ */}
                    <SortableHead
                      label={t("table.response")}
                      sortKey="responseTimeMs"
                      active={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                      className="hidden lg:table-cell w-24 pl-6"
                    />
                    {/* Checked — xl+ */}
                    <SortableHead
                      label={t("table.checked")}
                      sortKey="checkedAt"
                      active={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                      className="hidden xl:table-cell w-24"
                    />
                    {/* Delete */}
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {monitoredApps.map((app) => (
                    <AppRow
                      key={app.id}
                      app={app}
                      result={latestById[app.id]}
                      history={historyById[app.id] ?? []}
                      onDelete={handleRequestDelete}
                      isAdding={addingIds.has(app.id)}
                    />
                  ))}

                  {/* Unconfigured apps — collapsed by default */}
                  {unconfiguredApps.length > 0 && (
                    <>
                      <TableRow
                        className="cursor-pointer select-none hover:bg-muted/40 border-t-2"
                        role="button"
                        tabIndex={0}
                        onClick={() => setUnconfiguredOpen((o) => !o)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setUnconfiguredOpen((o) => !o);
                          }
                        }}
                        aria-expanded={unconfiguredOpen}
                      >
                        <TableCell colSpan={7} className="py-2.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ChevronRight
                              className={cn(
                                "h-3.5 w-3.5 transition-transform duration-150",
                                unconfiguredOpen && "rotate-90",
                              )}
                            />
                            <span>{t("table.noStatusPage")}</span>
                            <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium tabular-nums">
                              {unconfiguredApps.length}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {unconfiguredOpen &&
                        unconfiguredApps.map((app) => (
                          <AppRow
                            key={app.id}
                            app={app}
                            result={latestById[app.id]}
                            history={historyById[app.id] ?? []}
                            onDelete={handleRequestDelete}
                            dimmed
                            isAdding={addingIds.has(app.id)}
                          />
                        ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <AddAppDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onAddApp={handleAddApp}
            existingIds={existingIds}
          />
          <QuickSetupDialog
            open={quickSetupOpen}
            onOpenChange={setQuickSetupOpen}
            onBulkAddApps={handleBulkAddApps}
            existingIds={existingIds}
            existingNames={existingNames}
          />

          {/* Delete confirmation */}
          <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{t("delete.title")}</DialogTitle>
                <DialogDescription>
                  {t("delete.body", { name: deleteTarget?.appName ?? "" })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (deleteTarget) {
                      handleDeleteApp(deleteTarget.id);
                      setDeleteTarget(null);
                    }
                  }}
                >
                  {t("common.remove")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Event timeline — status transitions derived from ping history */}
          <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("header.timeline")}</DialogTitle>
                <DialogDescription>
                  {t("timeline.desc", { n: HISTORY_MAX })}
                </DialogDescription>
              </DialogHeader>
              {timelineEvents.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {t("timeline.empty")}
                </p>
              ) : (
                <ul className="max-h-[420px] divide-y overflow-y-auto">
                  {timelineEvents.map((ev, i) => (
                    <li key={`${ev.appId}-${ev.timestamp}-${i}`} className="flex items-center gap-3 py-2.5">
                      <AppLogo src={ev.logoUrl} alt={ev.appName} className="h-7 w-7 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">{ev.appName}</p>
                        <p className="text-xs">
                          <span className={STATUS_TEXT_CLASS[ev.from]}>{t(`status.${ev.from}`)}</span>
                          <span className="text-muted-foreground"> → </span>
                          <span className={STATUS_TEXT_CLASS[ev.to]}>{t(`status.${ev.to}`)}</span>
                        </p>
                        {ev.message && (
                          <p className="truncate text-[11px] text-muted-foreground/80" title={ev.message}>
                            {localizeStatusMessage(ev.message, t)}
                          </p>
                        )}
                      </div>
                      <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {new Date(ev.timestamp).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </DialogContent>
          </Dialog>

          <OnboardingDialog
            open={onboardingOpen}
            onOpenChange={setOnboardingOpen}
          />
          {shareImportApps && (
            <ShareImportDialog
              apps={shareImportApps}
              existingNames={existingNames}
              onImport={handleShareImport}
              onClose={() => setShareImportApps(null)}
            />
          )}
        </>
      )}
    </main>
  );
}
