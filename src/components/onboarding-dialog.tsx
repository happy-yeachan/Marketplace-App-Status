"use client";

import { PlusCircle, BarChart3, Zap, Sparkles } from "lucide-react";
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

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const { t } = useTranslation();
  const features: Array<{ icon: React.ReactNode; titleKey: string; bodyKey: string }> = [
    { icon: <Sparkles className="h-3.5 w-3.5 text-primary" />, titleKey: "onboarding.f1Title", bodyKey: "onboarding.f1Body" },
    { icon: <PlusCircle className="h-3.5 w-3.5 text-primary" />, titleKey: "onboarding.f2Title", bodyKey: "onboarding.f2Body" },
    { icon: <Zap className="h-3.5 w-3.5 text-primary" />, titleKey: "onboarding.f3Title", bodyKey: "onboarding.f3Body" },
    { icon: <BarChart3 className="h-3.5 w-3.5 text-primary" />, titleKey: "onboarding.f4Title", bodyKey: "onboarding.f4Body" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg">{t("onboarding.title")}</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            {t("onboarding.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {features.map(({ icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {icon}
              </div>
              <div>
                <h4 className="text-sm font-semibold">{t(titleKey)}</h4>
                <p className="text-xs text-muted-foreground">{t(bodyKey)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs text-muted-foreground">
            💾 {t("onboarding.privacyNote")}
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("onboarding.getStarted")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
