"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type CheckType, type MarketplaceSearchItem, type RegisteredApp } from "@/types";
import { guardOutboundUrl } from "@/lib/url-guard";
import { useTranslation } from "@/lib/i18n/use-translation";

interface AddAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddApp: (app: RegisteredApp) => void;
  existingIds?: Set<string>;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function ResultSkeleton() {
  return (
    <div className="space-y-0.5 p-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-md px-3 py-2.5"
        >
          <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-36 rounded bg-muted" />
            <div className="h-2.5 w-24 rounded bg-muted" />
          </div>
          <div className="h-5 w-16 shrink-0 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

/** Detect checkType from URL pattern. */
function detectCheckType(url: string): CheckType {
  if (
    url.includes("/api/v2/status.json") ||
    url.includes("/api/v2/summary.json") ||
    url.includes("/summary.json") ||
    url.includes("/index.json") ||
    url.includes("statuspage.io") ||
    url.includes("instatus.com")
  ) {
    return "statuspage_api";
  }
  return "http_ping";
}

export function AddAppDialog({
  open,
  onOpenChange,
  onAddApp,
  existingIds = new Set(),
}: AddAppDialogProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 400);
  const [results, setResults] = useState<MarketplaceSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Custom URL entry state — set when user clicks a "No URL" item
  const [pendingItem, setPendingItem] = useState<MarketplaceSearchItem | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setIsSearching(false);
    setOffset(0);
    setHasMore(false);
    setPendingItem(null);
    setCustomUrl("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetAll();
    onOpenChange(nextOpen);
  };

  // Focus URL input when pending item is shown
  useEffect(() => {
    if (pendingItem) {
      setTimeout(() => urlInputRef.current?.focus(), 50);
    }
  }, [pendingItem]);

  // Debounced search — resets to page 0 on new query
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) return;

    const controller = new AbortController();

    const doSearch = async () => {
      setIsSearching(true);
      setOffset(0);
      setHasMore(false);
      try {
        const res = await fetch(
          `/api/marketplace/search?query=${encodeURIComponent(debouncedQuery)}&limit=12&offset=0`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { items?: MarketplaceSearchItem[]; hasMore?: boolean };
        setResults(data.items ?? []);
        setHasMore(data.hasMore ?? false);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
          setHasSearched(true);
        }
      }
    };

    void doSearch();
    return () => controller.abort();
  }, [debouncedQuery]);

  const loadMore = async () => {
    const nextOffset = offset + 12;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/marketplace/search?query=${encodeURIComponent(debouncedQuery)}&limit=12&offset=${nextOffset}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items?: MarketplaceSearchItem[]; hasMore?: boolean };
      setResults((prev) => [...prev, ...(data.items ?? [])]);
      setHasMore(data.hasMore ?? false);
      setOffset(nextOffset);
    } catch {
      /* ignore */
    } finally {
      setIsLoadingMore(false);
    }
  };

  const commitAdd = (item: MarketplaceSearchItem, overrideUrl?: string) => {
    const finalUrl = overrideUrl?.trim() ?? item.statusUrl;
    onAddApp({
      id: item.id,
      appName: item.appName,
      vendorName: item.vendorName,
      logoUrl: item.logoUrl,
      statusUrl: finalUrl,
      checkType: finalUrl ? detectCheckType(finalUrl) : "custom",
    });
    setPendingItem(null);
    setCustomUrl("");
  };

  const handleSelect = (item: MarketplaceSearchItem) => {
    if (existingIds.has(item.id)) return;
    if (item.statusUrl) {
      // Auto-resolved URL — add immediately, no prompt needed
      commitAdd(item);
    } else {
      // No URL — prompt the user to optionally enter one
      setPendingItem(item);
      setCustomUrl("");
    }
  };

  const validateUrl = (url: string): { ok: boolean; reason?: string } => {
    if (!url) return { ok: false, reason: "" };
    const guard = guardOutboundUrl(url);
    if (!guard.ok) return { ok: false, reason: guard.reason };
    return { ok: true };
  };
  const isValidUrl = (url: string) => validateUrl(url).ok;
  const urlValidation = validateUrl(customUrl);

  const liveIsLong = query.trim().length >= 2;
  const debouncedIsLong = debouncedQuery.trim().length >= 2;
  const hasStaleResults = results.length > 0;

  const showHint = !liveIsLong;
  // Show skeleton only when there are no stale results to fall back on
  const showSkeleton = liveIsLong && (isSearching || !debouncedIsLong || !hasSearched) && !hasStaleResults;
  const showEmpty = debouncedIsLong && !isSearching && hasSearched && results.length === 0;
  // Stale-while-revalidate: keep previous results visible while a new search is in flight
  const showResults = hasStaleResults && liveIsLong;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-sm font-semibold">
            {t("addApp.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("addApp.description")}
          </DialogDescription>
        </DialogHeader>

        {/* ── URL entry view — shown when user clicks a "No URL" result ─────── */}
        {pendingItem ? (
          <div className="flex flex-col">
            {/* Back + selected app preview */}
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <button
                onClick={() => { setPendingItem(null); setCustomUrl(""); }}
                className="flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("common.back")}
              </button>
              <div className="mx-1 h-4 w-px bg-border" />
              <AppLogo src={pendingItem.logoUrl} alt={pendingItem.appName} className="h-7 w-7 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{pendingItem.appName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{pendingItem.vendorName}</p>
              </div>
              <span className="shrink-0 text-xs text-amber-500">{t("addApp.noUrlBadge")}</span>
            </div>

            {/* URL input */}
            <div className="px-4 py-4">
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                {t("addApp.urlLabel")} <span className="font-normal text-muted-foreground">{t("addApp.urlOptional")}</span>
              </label>
              <input
                ref={urlInputRef}
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customUrl && isValidUrl(customUrl)) {
                    commitAdd(pendingItem, customUrl);
                  }
                }}
                placeholder="https://status.vendor.com/api/v2/status.json"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {customUrl && !urlValidation.ok ? (
                <p className="mt-1.5 text-[11px] text-red-500">{urlValidation.reason}</p>
              ) : (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {t("addApp.urlHint")}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => commitAdd(pendingItem)}
              >
                {t("addApp.addWithoutUrl")}
              </Button>
              <Button
                size="sm"
                disabled={!customUrl || !isValidUrl(customUrl)}
                onClick={() => commitAdd(pendingItem, customUrl)}
              >
                {t("addApp.addWithUrl")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/*
              shouldFilter={false} — disables cmdk's built-in fuzzy filter so the
              list renders exactly in the order returned by our backend proxy, which
              already applies: exact match → starts-with → contains → API relevance.
            */}
            <Command shouldFilter={false} className="rounded-none border-0 shadow-none">
              {/* Input row — relative wrapper lets the spinner overlay the search icon */}
              <div className="relative border-b">
                <CommandInput
                  value={query}
                  onValueChange={setQuery}
                  autoFocus
                  placeholder={t("addApp.placeholder")}
                />
                {isSearching && (
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {/*
                CommandList is the scroll container.
                max-h-[480px] + overflow-y-auto keeps up to ~10 items visible
                while making the remaining ~40 results reachable by scrolling.
                min-h-[180px] prevents jarring height collapses between states.
              */}
              <CommandList className="max-h-[480px] min-h-[180px] overflow-y-auto p-0">
                {showHint && (
                  <p className="px-4 py-10 text-center text-xs text-muted-foreground">
                    {t("addApp.hint")}
                  </p>
                )}

                {showSkeleton && <ResultSkeleton />}

                {showEmpty && (
                  <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                    <p>{t("addApp.empty", { q: debouncedQuery })}</p>
                    {/* Marketplace listings are English-only — nudge users searching
                        in their native language toward the English app name. */}
                    {/[^\x20-\x7E]/.test(debouncedQuery) && (
                      <p className="mt-1.5 text-muted-foreground/80">{t("addApp.emptyHint")}</p>
                    )}
                  </div>
                )}

                {showResults && (
                  <div className={isSearching ? "opacity-50 transition-opacity duration-150" : undefined}>
                  {results.map((item) => {
                    const isAlreadyAdded = existingIds.has(item.id);
                    const isSupported = item.statusUrl !== "";

                    return (
                      /*
                        CommandItem renders a <div role="option"> — never a <button>.
                        This avoids the "button inside button" nesting error that plagued
                        the earlier plain-<button> approach inside Dialog.
                        Keyboard nav (↑ ↓ Enter) is provided by cmdk for free.
                      */
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        disabled={isAlreadyAdded}
                        onSelect={() => handleSelect(item)}
                        className="gap-3 px-3 py-2.5 [&>svg:last-child]:hidden"
                      >
                        {/* App logo — plain <img> with no-referrer bypasses CDN 403 */}
                        <AppLogo
                          src={item.logoUrl}
                          alt={item.appName}
                          className="h-9 w-9"
                        />

                        {/* App name + vendor */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium leading-tight">
                              {item.appName}
                            </span>
                            {isAlreadyAdded && (
                              <Badge
                                variant="secondary"
                                className="shrink-0 text-[10px] leading-tight"
                              >
                                {t("common.added")}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {item.vendorName}
                          </p>
                        </div>

                        {/* Status URL indicator (resolved server-side via VENDOR_STATUS_MAP) */}
                        <div className="shrink-0">
                          {isSupported ? (
                            <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t("addApp.autoBadge")}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-500">{t("addApp.noUrlBadge")}</span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                  </div>
                )}
                {/* Load more */}
                {hasMore && !isSearching && (
                  <div className="p-2 pt-0">
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      disabled={isLoadingMore}
                      className="flex w-full items-center justify-center gap-1.5 rounded-md border py-2 text-xs text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                    >
                      {isLoadingMore
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Loading…</>
                        : "Show more results"}
                    </button>
                  </div>
                )}
              </CommandList>
            </Command>

            {/* Footer legend */}
            <div className="border-t bg-muted/30 px-4 py-2">
              <p className="text-[10px] text-muted-foreground">
                <span className="font-medium text-emerald-600">{t("addApp.autoBadge")}</span> — {t("addApp.legendAuto")} &nbsp;
                <span className="font-medium text-amber-500">{t("addApp.noUrlBadge")}</span> — {t("addApp.legendNoUrl")}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
