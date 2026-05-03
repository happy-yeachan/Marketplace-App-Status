"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";

// Subscribe to <html class="dark"> changes so toggling in another tab
// (or via the anti-flicker script) is reflected without a setState-in-effect.
function subscribeToTheme(notify: () => void): () => void {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getThemeSnapshot = () => document.documentElement.classList.contains("dark");
// Server snapshot: assume light. The anti-flicker script in app/layout.tsx
// applies the class before hydration, and the html element uses
// suppressHydrationWarning so the brief mismatch is benign.
const getThemeServerSnapshot = () => false;

export function ThemeToggle() {
  const { t } = useTranslation();
  const dark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getThemeServerSnapshot);

  const toggle = () => {
    const next = !dark;
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? t("theme.toLight") : t("theme.toDark")}
      className="h-8 w-8 shrink-0"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
