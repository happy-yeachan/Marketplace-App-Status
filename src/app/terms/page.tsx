import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Atlassian App Status",
  description:
    "Terms governing your use of Atlassian App Status, a free, ad-free dashboard for Atlassian Marketplace app health.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-sm leading-7">
      <header className="mb-10">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: 2026-05-03</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Service</h2>
        <p>
          Atlassian App Status is a free, ad-free dashboard that aggregates
          publicly available status information from Atlassian Marketplace
          vendors. It is provided as-is, with no warranty of any kind.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">No affiliation with Atlassian</h2>
        <p>
          This service is an independent project. It is not affiliated with,
          endorsed by, or sponsored by Atlassian Pty Ltd. &ldquo;Jira&rdquo;,
          &ldquo;Confluence&rdquo;, &ldquo;Atlassian&rdquo;, and product names of
          third-party Marketplace vendors are trademarks of their respective
          owners.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">Data accuracy</h2>
        <p>
          Status information is fetched from each vendor&rsquo;s public status
          page. We do our best to map vendor identities to status URLs
          correctly, but we cannot guarantee the accuracy or freshness of
          third-party data. Always confirm critical incidents with the
          vendor&rsquo;s own status page.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Use the service to probe or attack third-party systems.</li>
          <li>Submit malformed or excessive requests intended to disrupt the service.</li>
          <li>Reverse-engineer the service for the purpose of replicating its proxying behaviour at scale.</li>
        </ul>
        <p>We reserve the right to rate-limit or block clients that abuse the service.</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">Liability</h2>
        <p>
          To the maximum extent permitted by law, the operators of Atlassian App
          Status are not liable for any direct, indirect, incidental, or
          consequential damages arising from your use of the service or
          reliance on the information it displays.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">Changes</h2>
        <p>
          These terms may change as the service evolves. The &ldquo;Last
          updated&rdquo; date at the top of this page reflects the current
          version. Continued use after changes constitutes acceptance.
        </p>
      </section>
    </article>
  );
}
