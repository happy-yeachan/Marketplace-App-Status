"use client";

import { AppLogo } from "@/components/app-logo";
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
import type { RegisteredApp } from "@/types";

interface ShareImportDialogProps {
  apps: RegisteredApp[];
  onImport: (apps: RegisteredApp[]) => void;
  onClose: () => void;
}

export function ShareImportDialog({
  apps,
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
          {apps.map((app) => (
            <li key={app.id} className="flex items-center gap-2 py-1 px-1">
              <AppLogo src={app.logoUrl} alt={app.appName} className="h-6 w-6 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{app.appName}</p>
                <p className="truncate text-xs text-muted-foreground">{app.vendorName}</p>
              </div>
            </li>
          ))}
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
