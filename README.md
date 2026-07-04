# Marketplace App Status

Real-time service health dashboard for Jira & Confluence third-party apps — no login, no database, no API token required.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-green)

**[Live Demo](https://marketplace.yeachan.cloud)** · [Report an Issue](https://github.com/happy-yeachan/Marketplace-App-Status/issues) · [한국어](./README.ko.md)

---

## Overview
Atlassian's own services have a status page, but the hundreds of third-party Marketplace apps that teams rely on every day — ScriptRunner, Tempo, Zephyr, draw.io, and many more — each publish their health on separate, vendor-hosted status pages. During an incident, engineers waste minutes hunting for the right URL.

**Marketplace App Status** aggregates live health from all your apps into one clean dashboard, with heartbeat history, response times, and instant incident notifications — all without touching your Atlassian instance.

<div align="center">
  <img width="100%" alt="Marketplace App Status Dashboard" src="https://github.com/user-attachments/assets/c5c03736-ee9e-469b-ba1a-d933c67348a0" />
  <p><strong>Real-time overview of all your Marketplace apps in one place</strong><br>
  <em>Instantly spot Outage or Degraded apps by color and jump directly to the vendor's status page with one click</em></p>
</div>

---

## Features

| Feature | Description |
|---|---|
| **Quick Setup** | One-click import of popular apps grouped by category. Status URLs auto-detected per vendor. |
| **Marketplace Search** | Search any app by name with paginated results (12 per page). Status URL resolved server-side from a curated vendor map. |
| **First-visit Defaults** | Six popular apps are pre-loaded on the first visit so the dashboard is immediately useful. Skipped when arriving via a share link. |
| **Atlassian Platform Status** | Dedicated banner showing real-time health across 23 Atlassian products (Jira, Confluence, Bitbucket, Loom, Rovo, etc.), fetched from each product's individual Statuspage API in parallel. |
| **Share via Link** | Generate a URL that encodes your app list. Recipients can import with one click — no server, no account needed. The payload is deflate-compressed and Base64URL-encoded in the `#share=` hash (never sent to the server); legacy uncompressed links are auto-detected. |
| **Auto-discovery** | For vendors not in the static map, probes common patterns (`status.vendor.com`, `vendor.statuspage.io`, etc.) in parallel with page-name validation to prevent false positives. |
| **Self-healing URLs** | When a vendor moves their status page, the dashboard detects the DNS failure, auto-discovers the new URL, retries the check, and silently persists the replacement. |
| **Live Health Checks** | Calls vendor status APIs from the Next.js server (avoids CORS). Supports Atlassian Statuspage, Instatus, and Hund.io formats. |
| **Per-app Component Matching** | On unified vendor pages (e.g. Adaptavist hosts ScriptRunner, Bitbucket Connector, etc. on one page), fuzzy-matches the specific app's component to avoid false positives from other apps' outages. |
| **Incident Headlines** | Active incident titles (with the latest update excerpt) from the vendor's status page are shown under the status badge — "Degraded — API latency in EU region" instead of a bare colour. |
| **Maintenance Status** | Planned maintenance is a distinct blue state (not a false "Degraded" alarm), and announced maintenance windows are surfaced ahead of time from `scheduled_maintenances`. |
| **Event Timeline** | Persistent log of status transitions ("draw.io: Operational → Outage, 14:32") derived from ping history — toasts disappear, the timeline doesn't. |
| **Heartbeat History** | Last 30 pings shown as colour-coded bars. Uptime % calculated per app (degraded/maintenance count as up; hidden below 3 samples). |
| **Result Caching** | Status results are persisted to localStorage and shown immediately on remount. Initial scan is skipped if the last check was less than 90 seconds ago — avoids redundant API calls on quick navigation. |
| **Auto-refresh** | Health checks run automatically at a configurable interval: Off / 1m / 5m / 15m. Default is 5 minutes. |
| **Status Change Notifications** | In-app toast when an app transitions between Operational / Degraded / Outage. Optionally enables browser notifications (via the Notifications permission) so you're alerted even when the tab is in the background. |
| **i18n** | UI available in 5 languages: English, 日本語, Deutsch, 한국어, Français. Locale persisted to localStorage. Privacy page includes jurisdiction-specific legal sections (GDPR, PIPA, APPI) per locale. |
| **Export / Import** | Download your app list as JSON, and restore it later from the same file (Import re-validates every entry and passes status URLs through the SSRF guard). |
| **Dark Mode** | Theme toggle with localStorage persistence and anti-flicker inline script. |
| **Confluence Embeddable** | Dedicated read-only `/embed` view for iframes: compact status board with summary counts, incident headlines, and auto-refresh. Stateless by design (app list in the URL hash, no localStorage) so it survives third-party-iframe storage partitioning. CSP `frame-ancestors` allows `*.atlassian.net`; `X-Frame-Options` is intentionally omitted (it doesn't support wildcards and overrides CSP in some browsers). |
| **No database** | All user state stored in `localStorage`. Requires a Next.js host (Vercel) for the server-side API routes — no database or authentication infrastructure needed. |

---

## Tech Stack

- **[Next.js 16](https://nextjs.org/)** (App Router, Turbopack) — server-side status API calls bypass CORS; client-only state for zero-DB architecture
- **[React 19](https://react.dev/)** — `memo`, `useCallback`, concurrent features
- **[TypeScript 5](https://www.typescriptlang.org/)** — strict mode throughout
- **[Tailwind CSS v4](https://tailwindcss.com/)** — utility-first styling with dark mode support
- **[base-ui](https://base-ui.com/)** — headless primitives (Tooltip, Dialog, Popover)
- **[shadcn/ui](https://ui.shadcn.com/)** — pre-built component shells (Table, Badge, Button)
- **[Lucide React](https://lucide.dev/)** — icon set
- **[cmdk](https://cmdk.paco.me/)** — command palette for app search
- **[Vercel Analytics](https://vercel.com/analytics)** + **[Speed Insights](https://vercel.com/docs/speed-insights)** — privacy-first usage and Core Web Vitals monitoring

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout — SEO metadata, anti-flicker dark mode script
│   ├── page.tsx                    # Single-page entry point
│   ├── privacy/page.tsx            # Privacy policy (locale-aware jurisdiction sections)
│   ├── terms/page.tsx              # Terms of service
│   └── api/
│       ├── status/
│       │   └── route.ts            # POST — health check engine (Statuspage, Instatus, Hund parsers, self-healing)
│       ├── atlassian-platform/
│       │   └── route.ts            # GET — Atlassian product health (23 products, parallel fetch)
│       └── marketplace/
│           ├── search/
│           │   └── route.ts        # GET — Atlassian Marketplace search proxy + auto-discovery (Edge Runtime)
│           └── popular/
│               └── route.ts        # GET — curated popular apps list with 1-hour in-memory cache
├── components/
│   ├── status-dashboard.tsx        # Main dashboard — state, table, toasts, share, dialogs
│   ├── add-app-dialog.tsx          # Search-based single-app add flow (with pagination)
│   ├── quick-setup-dialog.tsx      # Bulk-add popular apps with checkboxes by category
│   ├── share-import-dialog.tsx     # Preview & confirm import from a share link
│   ├── onboarding-dialog.tsx       # First-visit guide
│   ├── app-logo.tsx                # Logo with fallback to first-letter initials
│   ├── site-footer.tsx             # Footer with feedback and legal links
│   ├── language-switcher.tsx       # Locale selector
│   ├── theme-toggle.tsx            # Dark/light toggle
│   └── ui/                         # shadcn/base-ui component shells
├── lib/
│   ├── share.ts                    # Share payload codec (deflate-raw + Base64URL, legacy auto-detect)
│   ├── status-discovery.ts         # Auto-discovery probe engine + vendor name normaliser
│   ├── url-guard.ts                # SSRF guard for outbound URLs
│   ├── utils.ts                    # cn() Tailwind class merger
│   └── i18n/
│       ├── locales.ts              # Locale list and labels
│       ├── translations.ts         # All UI strings for 5 locales
│       └── use-translation.tsx     # useTranslation hook + LocaleProvider
└── types/
    └── index.ts                    # Shared types + PRODUCT_RULES + VENDOR_STATUS_MAP
```

---

## How Status Resolution Works

Status URL resolution is a four-step pipeline, evaluated in priority order:

### Step 1 — PRODUCT_RULES (highest priority)

`src/types/index.ts` contains keyword rules for products that have their own status page distinct from their parent vendor. Rules are matched against the app name (case-insensitive substring match).

```ts
{ keywords: ["zephyr enterprise"],  url: "https://zephyr-enterprise.status.smartbear.com/api/v2/status.json" },
{ keywords: ["scriptrunner"],       url: "https://status.connect.adaptavist.com/api/v2/summary.json" },
{ keywords: ["draw.io"],            url: "https://status.draw.io/index.json" },
```

Rules are evaluated in order — more specific entries must appear before broader ones. Rules also support an optional `vendor` guard field: when present, the normalised vendor name must also contain the guard string. This prevents generic keywords like `"structure"` or `"custom charts"` from matching apps by unrelated vendors.

```ts
// Only routes to Tempo if the vendor name also contains "tempo"
{ keywords: ["structure", "jira"], vendor: "tempo", url: "https://status.tempo.io/api/v2/status.json" },
```

### Step 2 — VENDOR_STATUS_MAP (fallback)

If no product rule matches, the vendor name is looked up in the static map. The lookup uses a `startsWith` + word-boundary check (not `includes`) to prevent partial-name collisions — e.g. `"refined"` must not match `"refinedx"`.

```ts
"tempo software":  "https://status.tempo.io/api/v2/summary.json",
"gitkraken":       "https://gij.gitkrakenstatus.com/api/v2/summary.json",
"lucid":           "https://status.lucid.co/api/v2/summary.json",
```

Raw Marketplace vendor names go through `normalizeVendorName()` before any lookup, collapsing M&A histories:

| Raw name | Normalised to |
|---|---|
| SoftwarePlant | appfire |
| Bob Swift | appfire |
| ALM Works | tempo software |
| Old Street Solutions | tempo software |
| OnResolve | adaptavist |
| iDalko / iGo Software | exalate |
| Axosoft | gitkraken |
| Xpand IT | xblend |

### Step 3 — Auto-discovery (for unknown vendors)

When neither map has an entry, `discoverStatusUrl()` in `src/lib/status-discovery.ts` probes common URL patterns in parallel:

```
status.{slug}.com/api/v2/status.json   (Atlassian Statuspage)
status.{slug}.com/summary.json         (Instatus)
status.{slug}.io/api/v2/status.json
{slug}.statuspage.io/api/v2/status.json
...
```

Each probe goes through two validation layers before being accepted:

1. **Shape validation** (`isStatuspageLike`) — the JSON must have `status.indicator` (Statuspage), `page.status` (Instatus), or `data` + `included` (Hund.io). Arbitrary JSON endpoints that happen to respond with 200 are rejected.
2. **Page-name validation** (`vendorPageNameMatch`) — the status page's own `page.name` must share the majority of meaningful tokens with the vendor name. Prevents `"Catapult Labs"` from matching a different company called "Catapult" that happens to own `status.catapult.com`.

Slugs that are too short (< 5 chars) or match a 50+ word blocklist of common English words (`open`, `smart`, `flow`, `work`, `release`, etc.) are skipped entirely.

All probes use `AbortSignal.timeout(2000)` to fail fast. `Promise.any()` returns the first successful hit. Runs during Marketplace search (capped at 12 unique vendors per query, bounding added latency to ~800 ms).

### Step 4 — Self-healing (runtime URL recovery)

When a health check throws a DNS/connection error (`ENOTFOUND`, `ECONNREFUSED`, `getaddrinfo`, etc.) the stored URL is stale — the vendor moved their status page. The catch block:

1. Calls `discoverStatusUrl()` to find the new URL (same 2 s probe budget).
2. Retries the health check against the new URL so the current request still returns a real result.
3. Returns `updatedStatusUrl` in the response.

The dashboard's `applyResults()` detects the field and calls `setApps()` to overwrite the stored URL in localStorage. All future checks automatically use the correct address — no user action required.

Self-healing only activates for `checkType === "statuspage_api"` apps. `http_ping` apps monitor URLs explicitly chosen by the user; silently replacing them would be wrong.

---

## False Positive Prevention

The pipeline uses multiple independent layers to ensure status data is always meaningful:

| Layer | Where | What it prevents |
|---|---|---|
| `isStatuspageLike()` | `status-discovery.ts` | Arbitrary JSON endpoints accepted as status pages |
| `vendorPageNameMatch()` | `status-discovery.ts` | Discovery binding to the wrong company's status page |
| `SLUG_BLOCKLIST` (50+ words) | `status-discovery.ts` | Generic English words probed as subdomains (`status.open.com`, `status.work.io`, …) |
| `startsWith` + word boundary | `types/index.ts` | Partial vendor name collisions in VENDOR_STATUS_MAP lookup |
| `vendor?` guard on PRODUCT_RULES | `types/index.ts` | Generic keyword rules matching apps from unrelated vendors |
| `VENDOR_BLACKLIST` | `types/index.ts` | Vendors without public status pages picked up by auto-discovery |
| Blacklist check in `enrichWithDiscovery` | `marketplace/search/route.ts` | Blacklisted vendors re-entering discovery via the empty-statusUrl filter |

---

## Health Check Engine

`POST /api/status` accepts an array of `RegisteredApp` objects and returns health results for each. It auto-detects the response format:

### Supported formats

| Format | Detection | Example vendors |
|---|---|---|
| **Atlassian Statuspage** `summary.json` | `payload.status.indicator` field present | SmartBear, Adaptavist, Tempo, Gliffy |
| **Instatus** `summary.json` | `payload.page.status` field present | OBoard, Exalate |
| **Hund.io / JSON:API** `index.json` | `payload.data` + `payload.included` present | draw.io |
| **HTTP ping** | `checkType === "http_ping"` | Any URL |

### Status mapping

| Raw status | Our status |
|---|---|
| `operational`, `none` indicator, `UP` | ✅ Operational |
| `degraded_performance`, `partial_outage`, `minor` indicator, `UNDERMAINTENANCE` | ⚠️ Degraded |
| `major_outage`, `critical`, `MAJOROUTAGE` | 🔴 Outage |

`partial_outage` maps to **Degraded** (not Outage) — a partial outage means some nodes are affected, not the entire service.

### Per-app component matching on unified pages

Many vendors host all their products on one status page (e.g. Adaptavist hosts ScriptRunner, Bitbucket Connector, ScriptRunner for Confluence, etc. all under `status.connect.adaptavist.com`). A global `"partial outage"` on that page could mean any one of dozens of components is down — not necessarily the app you care about.

The health check engine runs a two-pass match against the component list:

1. **Fuzzy name match** — strips "for Jira/Confluence" suffixes and normalises punctuation, then checks for substring inclusion both ways.
2. **Token score match** — tokenises the app name (excluding stop words and platform words like "jira"), scores each component by keyword and platform overlap. Leaf components inherit their parent group name for scoring — e.g. a component called "Synchronisation node" inside the "Jira Cloud" group scores as "Jira Cloud Synchronisation node", giving it a platform bonus for Jira apps.

Platform words (`jira`, `confluence`) are excluded from the main token set and scored separately. A component that only shares a platform word with the app name scores 0 — this prevents every `"* for Jira"` entry on a unified page from being treated as a match.

Only a non-zero score component is selected. If no component matches, the global page status is used.

---

## Share Link

The share feature encodes your entire app list into a URL hash — no server storage involved.

```
https://marketplace.yeachan.cloud/#share=z:jVNNb9swDP0rgs5x4TjK...
```

**Encoding (v3, current):** each app is minimised to a compact tuple `[id, appName, vendorName, compressedStatusUrl, checkTypeChar, logoAssetId?]` (common status-URL suffixes like `/api/v2/status.json` are replaced by 2-char codes, the logo URL is reduced to its CDN asset ID). The tuple array is JSON-serialised, deflate-raw-compressed, Base64URL-encoded, and prefixed with `z:`. Legacy formats — v2 (`z:` + compressed JSON objects) and v1 (plain Base64URL JSON) — are auto-detected on decode. The hash fragment is never sent to the server.

**Importing:** if a `#share=` hash is detected (on load or via `hashchange` in an already-open tab), a preview dialog lists the incoming apps — including each app's status-URL domain, so recipients can spot unexpected targets — and marks apps already on the dashboard. Corrupted/truncated payloads show an error toast. On confirm, apps already in the dashboard (matched by app name) are skipped, status URLs failing the SSRF guard are stripped, and the imported apps trigger an immediate status check.

**First-visit behaviour:** when a new user arrives via a share link, the default app seeding is skipped — the dashboard starts empty and populates only with the shared apps after the user confirms the import.

**Quick Setup compatibility:** Marketplace app IDs are preserved in the share payload, so apps imported via share link are correctly detected as "already added" in the Quick Setup dialog.

### Embed view (`/embed`)

The share menu also offers **Copy embed link (iframe)** — a live, read-only team status board for wiki pages:

```
https://marketplace.yeachan.cloud/embed#apps=z:jVNNb9sw...&theme=auto
```

- Same payload codec as share links, but under the `#apps=` hash namespace so an embed URL never triggers the dashboard's import dialog.
- **Stateless**: the app list comes from the hash, nothing is written to localStorage — third-party iframes get partitioned/blocked storage in several browsers, so a storage-backed embed would break exactly where it's used. The hash is never sent to the server.
- Auto-refreshes every 5 minutes with a per-viewer jitter (up to 30 s) so N teammates viewing the same page don't hit vendor APIs in lockstep.
- Optional query params: `?theme=dark|light` (default: auto), `?lang=en|ja|de|ko|fr` (default: browser language).
- "Open full dashboard" links to the equivalent `#share=` URL so viewers can import the list into their own dashboard.
- Recommended iframe height: `count × 41 + 80` px (each row ≈ 41 px plus the summary bar).

---

## Data Model

All state lives in `localStorage` — no database or authentication required.

```ts
// "jira-marketplace-apps"
RegisteredApp {
  id: string           // Marketplace addon key (e.g. "com.mxgraph.jira.drawio")
  appName: string
  vendorName: string
  checkType: CheckType // "statuspage_api" | "http_ping" | "custom"
  statusUrl: string    // Resolved API endpoint
  logoUrl?: string     // CDN URL from Marketplace
}

// "jira-marketplace-history"
Record<appId, PingRecord[]>  // Up to last 30 pings per app

// "jira-marketplace-latest"
Record<appId, HealthCheckResult>  // Most recent check result per app (shown on remount before next scan)

// "jira-marketplace-last-checked"
string  // ISO 8601 timestamp of the last full scan (used for 90 s remount cooldown)

PingRecord {
  status: "operational" | "degraded" | "outage"
  timestamp: string     // ISO 8601
  responseTimeMs: number | null
  message?: string
}
```

On every mount, stored apps are migrated against the latest `PRODUCT_RULES` and `VENDOR_STATUS_MAP`. This silently fixes stale status URLs from old versions without requiring a manual reset.

---

## API Routes

### `POST /api/status`

Run health checks for a batch of apps.

**Request:**
```json
{
  "apps": [
    {
      "id": "com.onresolve.jira.groovy.groovyrunner",
      "appName": "ScriptRunner for Jira",
      "vendorName": "Adaptavist",
      "checkType": "statuspage_api",
      "statusUrl": "https://status.connect.adaptavist.com/api/v2/summary.json"
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "appId": "com.onresolve.jira.groovy.groovyrunner",
      "status": "operational",
      "checkedAt": "2026-05-04T09:00:00.000Z",
      "responseTimeMs": 312,
      "message": "ScriptRunner for Jira: operational"
    }
  ]
}
```

When self-healing kicks in, the result also includes:

```json
{
  "updatedStatusUrl": "https://new.vendor-status.com/api/v2/summary.json",
  "updatedCheckType": "statuspage_api"
}
```

The client persists the new URL to localStorage automatically.

**Rate limit:** 600 apps per IP per 60-second window (in-memory, resets per serverless instance).

### `GET /api/atlassian-platform`

Returns the real-time health of 23 Atlassian products in parallel. Each product is checked against its own individual Statuspage API (the unified `summary.json` is not used — it is known to lag during active incidents).

**Response:**
```json
{
  "overallIndicator": "none",
  "products": [
    { "name": "Jira", "indicator": "none", "description": "All Systems Operational" },
    { "name": "Confluence", "indicator": "minor", "description": "Degraded Performance" }
  ]
}
```

`overallIndicator` is the worst individual product indicator. Cached for 60 seconds (`s-maxage=60, stale-while-revalidate=120`).

### `GET /api/marketplace/search?query={text}&limit={n}&offset={n}`

Proxy to the Atlassian Marketplace REST API v2. Runs on **Edge Runtime** for near-zero cold-start latency. Returns apps enriched with resolved status URLs. Runs auto-discovery for vendors not in the static map (capped at 12 unique vendors per query, 800 ms budget). Blacklisted vendors are excluded from discovery.

Supports pagination via `offset` — the Add App dialog fetches 12 results per page with a "Show more" button appending the next page.

Results are cached at the CDN layer for 60 seconds (`s-maxage=60, stale-while-revalidate=120`).

> The Marketplace API uses `text=` (not `q=`) for full-text search. This proxy handles the parameter correctly and re-ranks results by text similarity before returning.

### `GET /api/marketplace/popular`

Returns a curated list of popular Jira apps grouped by category, with logos and status URLs resolved. Results are cached in-memory for 1 hour.

**Categories:** Automation · Time Tracking · Testing & QA · Diagrams · Reporting · Planning · Dev Tools · Integrations · Utilities

---

## Supported Vendors

The following vendors are covered by the static map and will always resolve without auto-discovery:

| Vendor | Status Page |
|---|---|
| Atlassian | status.atlassian.com |
| Appfire (+ SoftwarePlant, Bob Swift, Comalatech, …) | appfire-apps.statuspage.io |
| Tempo Software (+ ALM Works, Old Street, Roadmunk, …) | status.tempo.io |
| Adaptavist (+ OnResolve, Brikit) | status.connect.adaptavist.com |
| Meetical | meetical.statuspage.io |
| SmartBear (Zephyr family, BitBar, Cucumber) | per-product subdomains |
| GitKraken (+ Axosoft) | gij.gitkrakenstatus.com |
| Exalate (+ iDalko, iGo Software) | status.exalate.com |
| JGraph (draw.io) | status.draw.io |
| Gliffy | status.gliffy.com |
| Balsamiq | status.balsamiq.com |
| Lucid | status.lucid.co |
| Miro | status.miro.com |
| EazyBI | status.eazybi.com |
| OBoard | oboard.instatus.com |
| Xblend / Xpand IT (Xray, Xporter) | per-product |
| Tricentis | status.tricentis.com |
| Resolution | status.resolution.de |
| HeroCoders | status.herocoders.com |
| Move Work Forward | status.moveworkforward.com |
| Elements | status.elements-apps.com |
| Deviniti | deviniti.statuspage.io |
| Refined | status.refined.com |
| Deiser | status.deiser.com |
| Easy Agile | status.easyagile.com |
| Aha! | status.aha.io |
| ProjectBalm | projectbalm.statuspage.io |
| DevSamurai | status.devsamurai.com |
| Twinit | twinit.statuspage.io |
| SolDevelo | soldevelo.statuspage.io |
| Bloompeak | bloompeak.statuspage.io |
| Codefortynine | status.codefortynine.com |
| SaaSJet | status.saasjet.com |
| TeamLead | teamlead.statuspage.io |
| MindPro | mindpro.statuspage.io |
| Cypress.io | cypress.statuspage.io |

Vendors confirmed to have no public status page (`VENDOR_BLACKLIST`): `k15t`, `midori`, `reliex`, `ease solutions`, `open source consulting`, `decadis`, `meta-inf`.

---

## Self-hosting

Requires a Next.js-compatible host (Vercel recommended) for the server-side API routes. Pure static hosts (GitHub Pages, Cloudflare Pages without Workers) are not supported.

```bash
git clone https://github.com/happy-yeachan/Marketplace-App-Status.git
cd Marketplace-App-Status
npm install
npm run dev   # http://localhost:3000
```

**Environment variables (optional):**

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://marketplace.yeachan.cloud` | Used for canonical URL, OG tags, sitemap |

---

## Extending the App

### Adding a new vendor to the static map

Edit `VENDOR_STATUS_MAP` in `src/types/index.ts`:

```ts
"yourvendor": "https://status.yourvendor.com/api/v2/summary.json",
```

Keys are lowercase. Use `summary.json` over `status.json` — the health check engine needs component-level data for per-app matching on unified vendor pages.

If the vendor name in the Marketplace differs from your map key (e.g. due to acquisitions), add a normalisation rule to `normalizeVendorName()` in `src/lib/status-discovery.ts`:

```ts
if (l.includes("acquiredname")) return "yourvendor";
```

### Adding a product-specific rule

Use this when a product has its own dedicated status page separate from the parent vendor. Add to `PRODUCT_RULES` in `src/types/index.ts` **before** any generic vendor entry for the same vendor:

```ts
{ keywords: ["your product name"], url: "https://status.yourproduct.com/api/v2/summary.json" },
```

If the product name keywords are generic English words that could appear in unrelated app names, add a `vendor` guard:

```ts
{ keywords: ["your product", "jira"], vendor: "yourvendor", url: "https://..." },
```

### Marking a vendor as having no status page

Add to `VENDOR_BLACKLIST` in `src/types/index.ts` to suppress auto-discovery for that vendor's apps:

```ts
export const VENDOR_BLACKLIST = new Set([
  "yourvendor",
]);
```

### Adding to the Quick Setup list

Edit the `CURATED` array in `src/app/api/marketplace/popular/route.ts`:

```ts
{ query: "Your App Name for Jira", vendorHint: "vendorname", category: "Utilities" },
```

- `query` — passed as-is to the Marketplace search API
- `vendorHint` — substring matched against the vendor name to pick the correct result when multiple apps share similar names
- `category` — one of: `Automation` · `Time Tracking` · `Testing & QA` · `Diagrams` · `Reporting` · `Planning` · `Dev Tools` · `Integrations` · `Utilities`

### Adding a new locale

1. Add the locale code to `src/lib/i18n/locales.ts`
2. Add a full translation object to `src/lib/i18n/translations.ts`
3. If the locale has specific legal requirements (GDPR, PIPA, etc.), add `privacy.jurisdictionHeading` and `privacy.jurisdictionBody` keys and add the locale to the `hasJurisdictionSection` list in `src/app/privacy/page.tsx`

---

## Architecture Decisions

**Why no database?** The target user is a single Jira administrator or developer who wants a personal dashboard. `localStorage` is simpler, faster, and requires zero infrastructure. All data stays on the user's device.

**Why a Next.js server proxy for status checks?** Vendor status pages block direct browser requests via CORS. Running the fetch from the Next.js server avoids this entirely. The proxy also normalises response formats so the client never has to handle Statuspage vs. Instatus differences.

**Why a static vendor map instead of scraping?** Status page URLs rarely change. A curated map gives deterministic, tested results. Auto-discovery fills the gap for the long tail of vendors not yet in the map.

**Why `summary.json` over `status.json`?** The Atlassian Statuspage `summary.json` endpoint includes the full component list, which is required for per-app component matching on unified vendor pages. `status.json` only returns the global indicator. The health check route upgrades any legacy `status.json` URLs transparently.

**Why check individual Atlassian product pages instead of the unified summary?** During the major Atlassian outage in May 2026, the unified `https://status.atlassian.com/api/v2/summary.json` returned `indicator: "none"` while 20+ individual product pages were actively showing incidents. The unified API lags behind; individual product Statuspages are the authoritative source.

**Why `#share=` hash for sharing?** The hash fragment is not sent to the server — the app list stays entirely client-side even when sharing. No file upload, no database write, no expiry. The trade-off is a longer URL, but with tuple minimisation + deflate compression the payload stays well under 2 KB even for 30 apps.

**Why not import from Jira directly?** Jira's UPM REST API only returns apps installed via the traditional P2 (server/DC) plugin system. Forge apps (the modern cloud platform) — which includes ScriptRunner Cloud and many newer apps — are invisible to UPM. Since this would silently miss a large fraction of cloud-hosted apps, the import flow was replaced with the Quick Setup curated list and Marketplace search, both of which use the public Marketplace API.

**Why self-healing instead of just reporting a URL error?** Reliability is the core promise of this dashboard. If the stored URL is stale (DNS failure) and the app simply reports "outage", that's a false alarm — worse than useless during an actual incident. Self-healing distinguishes network-level failures (stale URL) from HTTP-level failures (real outage) and recovers automatically, so the health signal stays trustworthy.

---

## Contributing & Feedback

Found a vendor with a wrong or missing status page? Want to suggest a new feature?

- **[Open an issue](https://github.com/happy-yeachan/Marketplace-App-Status/issues)** — bug reports, vendor mapping corrections, feature requests
- **Pull requests welcome** — especially for adding vendors to `VENDOR_STATUS_MAP` or `PRODUCT_RULES`

This project is not affiliated with Atlassian.

---

## License

MIT
