"use client";

import { ShieldAlert } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/use-translation";
import { guardOutboundUrl } from "@/lib/url-guard";
import type { RegisteredApp } from "@/types";

interface ShareImportDialogProps {
  apps: RegisteredApp[];
  /** Lowercased app names already on the dashboard — marked "added" in the preview. */
  existingNames: Set<string>;
  onImport: (apps: RegisteredApp[]) => void;
  onClose: () => void;
}

/** Extract the hostname for display; null when there is no URL or it is unparsable. */
function statusUrlHost(statusUrl: string): string | null {
  if (!statusUrl) return null;
  try {
    return new URL(statusUrl).hostname;
  } catch {
    return null;
  }
}

export function ShareImportDialog({
  apps,
  existingNames,
  onImport,
  onClose,
}: ShareImportDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("share.importTitle")}</DialogTitle>
          <DialogDescription>
            {t("share.importDesc", { count: apps.length })}
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-64 overflow-y-auto space-y-1 rounded-md border p-2">
          {apps.map((app) => {
            const alreadyAdded = existingNames.has(app.appName.toLowerCase());
            const host = statusUrlHost(app.statusUrl);
            const blocked = Boolean(app.statusUrl) && !guardOutboundUrl(app.statusUrl).ok;
            return (
              <li
                key={app.id}
                className={`flex items-center gap-2 py-1 px-1 ${alreadyAdded ? "opacity-50" : ""}`}
              >
                <AppLogo src={app.logoUrl} alt={app.appName} className="h-6 w-6 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{app.appName}</p>
                    {alreadyAdded && (
                      <Badge variant="secondary" className="shrink-0 text-[10px] leading-tight">
                        {t("common.added")}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{app.vendorName}</p>
                </div>
                {/* Status URL domain — always visible so recipients can spot
                    unexpected targets hidden behind a familiar app name. */}
                {blocked ? (
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-red-500">
                    <ShieldAlert className="h-3 w-3" />
                    {t("share.blockedUrl")}
                  </span>
                ) : host ? (
                  <span className="max-w-[40%] shrink-0 truncate font-mono text-[11px] text-muted-foreground">
                    {host}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] text-muted-foreground/60">
                    {t("table.noStatusPage")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => onImport(apps)}>
            {t("share.importButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
