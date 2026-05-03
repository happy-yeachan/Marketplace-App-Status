"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/locales";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("common.language")}>
            <Languages className="h-4 w-4" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-40 p-1">
        <ul className="flex flex-col">
          {LOCALES.map((l: Locale) => (
            <li key={l}>
              <button
                type="button"
                onClick={() => { setLocale(l); setOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                  locale === l && "font-semibold",
                )}
              >
                <span>{LOCALE_LABELS[l]}</span>
                {locale === l && <span aria-hidden className="text-xs text-muted-foreground">●</span>}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
