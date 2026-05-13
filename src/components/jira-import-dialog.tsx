"use client";

import { useState } from "react";
import { CheckCircle2, Download } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import type { RegisteredApp } from "@/types";
import { useTranslation } from "@/lib/i18n/use-translation";

interface JiraImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (apps: RegisteredApp[]) => void;
  existingIds?: Set<string>;
  existingNames?: Set<string>;
}

interface ImportResult {
  apps: RegisteredApp[];
  total: number;
  mappedCount: number;
}

export function JiraImportDialog({
  open,
  onOpenChange,
  onImport,
  existingIds = new Set(),
  existingNames = new Set(),
}: JiraImportDialogProps) {
  const { t } = useTranslation();

  // Step 1 fields
  const [jiraUrl, setJiraUrl] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 state
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const step = result ? 2 : 1;

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jira/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jiraUrl, email, apiToken }),
      });
      const data = (await res.json()) as ImportResult & { error?: string };
      if (!res.ok || data.error) {
        setError(t(data.error ?? "jiraImport.error.generic"));
        return;
      }
      setResult(data);
      // Default: select apps with statusUrl that aren't already added
      setSelected(
        new Set(
          data.apps
            .filter(
              (a) =>
                a.statusUrl !== "" &&
                !existingIds.has(a.id) &&
                !existingNames.has(a.appName.toLowerCase()),
            )
            .map((a) => a.id),
        ),
      );
    } catch {
      setError(t("jiraImport.error.generic"));
    } finally {
      setLoading(false);
    }
  };

  const addableApps = result
    ? result.apps.filter(
        (a) => !existingIds.has(a.id) && !existingNames.has(a.appName.toLowerCase()),
      )
    : [];
  const selectableIds = new Set(addableApps.map((a) => a.id));

  const allSelected =
    selectableIds.size > 0 && [...selectableIds].every((id) => selected.has(id));
  const noneSelected = selectableIds.size === 0 || [...selectableIds].every((id) => !selected.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...selectableIds]));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (!result) return;
    const toAdd = result.apps.filter(
      (a) =>
        selected.has(a.id) &&
        !existingIds.has(a.id) &&
        !existingNames.has(a.appName.toLowerCase()),
    );
    if (toAdd.length > 0) onImport(toAdd);
    onOpenChange(false);
  };

  const handleBack = () => {
    setResult(null);
    setError(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset on close
      setResult(null);
      setError(null);
      setJiraUrl("");
      setEmail("");
      setApiToken("");
    }
    onOpenChange(open);
  };

  const selectedCount = [...selected].filter((id) => !existingIds.has(id)).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <DialogTitle className="text-sm font-semibold">{t("jiraImport.title")}</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            {t("jiraImport.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Credentials form */}
        {step === 1 && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t("jiraImport.urlLabel")}</label>
                <div className="flex items-center rounded-lg border border-input bg-transparent overflow-hidden focus-within:ring-3 focus-within:ring-ring/50 focus-within:border-ring">
                  <span className="pl-2.5 text-sm text-muted-foreground select-none">https://</span>
                  <input
                    type="text"
                    value={jiraUrl}
                    onChange={(e) => setJiraUrl(e.target.value)}
                    placeholder={t("jiraImport.urlPlaceholder")}
                    className="h-8 flex-1 min-w-0 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{t("jiraImport.urlHint")}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t("jiraImport.emailLabel")}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("jiraImport.emailPlaceholder")}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">{t("jiraImport.tokenLabel")}</label>
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    {t("jiraImport.tokenLink")}
                  </a>
                </div>
                <Input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="••••••••••••••••"
                />
                <p className="text-[11px] text-muted-foreground">{t("jiraImport.tokenHint")}</p>
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter className="border-t px-5 py-3">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                disabled={loading || !jiraUrl.trim() || !email.trim() || !apiToken.trim()}
                onClick={() => void handleImport()}
              >
                {loading ? t("jiraImport.importing") : t("jiraImport.importButton")}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Results & selection */}
        {step === 2 && result && (
          <>
            <div className="border-b px-5 py-2.5">
              <p className="text-xs text-muted-foreground">
                {t("jiraImport.found", { total: result.total, mapped: result.mappedCount })}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                {/* Select all / deselect all */}
                <label className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && !noneSelected;
                    }}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {allSelected ? t("quickSetup.deselectAll") : t("quickSetup.selectAll")}
                  </span>
                  {selectedCount > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{selectedCount}</span>
                  )}
                </label>

                <div className="my-1 border-t" />

                {result.apps.map((app) => {
                  const isAdded =
                    existingIds.has(app.id) || existingNames.has(app.appName.toLowerCase());
                  const isChecked = selected.has(app.id);
                  return (
                    <label
                      key={app.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                        isAdded ? "opacity-50" : "hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isAdded}
                        onChange={() => !isAdded && toggleOne(app.id)}
                        className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                      />
                      <AppLogo
                        src={app.logoUrl}
                        alt={app.appName}
                        className="h-8 w-8 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium leading-tight">
                            {app.appName}
                          </span>
                          {isAdded && (
                            <Badge variant="secondary" className="shrink-0 text-[10px] leading-tight">
                              {t("common.added")}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{app.vendorName}</p>
                      </div>
                      <div className="shrink-0">
                        {app.statusUrl ? (
                          <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("addApp.autoBadge")}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500">{t("addApp.noUrlBadge")}</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="border-t px-5 py-3">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                {t("jiraImport.backToForm")}
              </Button>
              <Button size="sm" disabled={selectedCount === 0} onClick={handleAdd}>
                {t("jiraImport.add", { n: selectedCount })}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
