import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-background/40 py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-[11px] text-muted-foreground sm:flex-row">
        <p>
          Atlassian App Status — independent project, not affiliated with Atlassian.
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
