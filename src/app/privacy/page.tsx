import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Atlassian App Status",
  description:
    "How Atlassian App Status handles your data. Short version: it doesn't. Everything stays in your browser.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-sm leading-7">
      <header className="mb-10">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: 2026-05-03</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Short version</h2>
        <p>
          Atlassian App Status is a client-side dashboard. We do not run a database,
          we do not have user accounts, and we do not collect personal information.
          Your app list, status history, and any optional Jira credentials never
          leave your browser.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">What stays in your browser</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>The list of Marketplace apps you add (vendor name, status URL, logo URL).</li>
          <li>Health-check history for each app (last 30 results per app).</li>
          <li>Theme and refresh-interval preferences.</li>
        </ul>
        <p>
          All of the above is stored exclusively in your browser&rsquo;s localStorage.
          Clearing site data removes it permanently.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">What our server does</h2>
        <p>
          When the dashboard checks app health, your browser POSTs the app list to
          our <code>/api/status</code> endpoint, which then fetches each vendor&rsquo;s
          public status page on your behalf and returns the parsed result. We do
          this server-side because most vendor status pages do not allow
          cross-origin requests from browsers.
        </p>
        <p>The server keeps no logs of your app list or fetch responses beyond
          short-lived runtime memory used to honour the request. We do not write
          your data to disk, share it with third parties, or use it for analytics.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">Cookies & tracking</h2>
        <p>
          We do not set cookies. We do not run third-party analytics or
          advertising trackers. The only client-side storage is the localStorage
          described above.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">Contact</h2>
        <p>
          Questions about this policy? Open an issue on the project&rsquo;s
          GitHub repository or reach out via the contact link in the
          repository README.
        </p>
      </section>
    </article>
  );
}
