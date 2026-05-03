import type { Locale } from "./locales";

// All user-visible strings live here, indexed by a flat key namespace.
// Keep keys descriptive: <area>.<purpose>. Place argument placeholders as
// {name} and substitute at the call site via the `t()` helper.
type Translations = Record<string, string>;

const en: Translations = {
  // Common
  "common.cancel": "Cancel",
  "common.remove": "Remove",
  "common.back": "Back",
  "common.added": "Added",
  "common.close": "Close",
  "common.help": "Help",
  "common.language": "Language",

  // Header
  "header.title": "Marketplace App Status",
  "header.subtitle": "Real-time service health for Jira & Confluence third-party apps.",
  "header.lastChecked": "Last checked {time}",
  "header.disclaimer": "Independent project — not affiliated with Atlassian.",
  "header.refresh": "Refresh",
  "header.exportTooltip": "Export app list",
  "header.quickSetup": "Quick Setup",
  "header.addApp": "Add App",
  "header.howToUse": "How to use",

  // Status badges
  "status.operational": "Operational",
  "status.degraded": "Degraded",
  "status.outage": "Outage",
  "status.monitored": "{n} monitored",

  // Empty state
  "empty.title": "No apps monitored",
  "empty.body": "Pick the apps your team uses from a curated list, or search the Marketplace.",

  // Table
  "table.app": "App",
  "table.vendor": "Vendor",
  "table.status": "Status",
  "table.history": "History (last {n})",
  "table.response": "Response",
  "table.checked": "Checked",
  "table.noStatusPage": "No status page",

  // Onboarding dialog
  "onboarding.title": "Welcome to the Status Dashboard",
  "onboarding.description": "Monitor the health of every Marketplace app you rely on.",
  "onboarding.f1Title": "Quick Setup",
  "onboarding.f1Body": "Start with curated popular apps — status URLs are auto-detected per vendor. No manual entry needed.",
  "onboarding.f2Title": "Add Apps Manually",
  "onboarding.f2Body": "Search the Marketplace by name or paste custom status page URLs for unlisted vendors.",
  "onboarding.f3Title": "Real-Time Status",
  "onboarding.f3Body": "Check health instantly or set up auto-refresh. No authentication required.",
  "onboarding.f4Title": "History & Uptime",
  "onboarding.f4Body": "Heartbeat bars show recent uptime trends. All data stored locally in your browser.",
  "onboarding.privacyNote": "Privacy: all apps and history are stored only in your browser's localStorage. Nothing is sent to external servers except vendor status API calls.",
  "onboarding.getStarted": "Get Started",

  // Add app dialog
  "addApp.title": "Add App from Atlassian Marketplace",
  "addApp.description": "Search and click to add — status URL is auto-detected per vendor, no manual entry needed.",
  "addApp.placeholder": "Type app name (e.g. draw.io, Zephyr, Tempo…)",
  "addApp.hint": "Type at least 2 characters to search the Marketplace.",
  "addApp.empty": "No apps found for “{q}”.",
  "addApp.autoBadge": "Auto",
  "addApp.noUrlBadge": "No URL",
  "addApp.urlLabel": "Status page URL",
  "addApp.urlOptional": "(optional)",
  "addApp.urlHint": "Paste the vendor's /api/v2/status.json or /summary.json endpoint. Leave blank to add without monitoring.",
  "addApp.addWithoutUrl": "Add without URL",
  "addApp.addWithUrl": "Add with URL →",
  "addApp.legendAuto": "status URL is mapped to a known vendor.",
  "addApp.legendNoUrl": "click to enter a custom URL or add without monitoring.",

  // Quick setup
  "quickSetup.title": "Quick Setup",
  "quickSetup.description": "Pick popular Marketplace apps. Status URLs are pre-mapped per vendor.",
  "quickSetup.selectAll": "Select all",
  "quickSetup.deselectAll": "Deselect all",
  "quickSetup.add": "Add {n}",
  "quickSetup.loading": "Loading popular apps…",
  "quickSetup.error": "Could not load popular apps. Try again later.",

  // Delete dialog
  "delete.title": "Remove app",
  "delete.body": "Remove {name} from your dashboard? This also clears its history.",

  // Footer
  "footer.line": "Marketplace App Status — independent project, not affiliated with Atlassian.",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",

  // Theme
  "theme.toLight": "Switch to light mode",
  "theme.toDark": "Switch to dark mode",

  // Privacy page
  "privacy.title": "Privacy Policy",
  "privacy.lastUpdated": "Last updated: 2026-05-03",
  "privacy.shortHeading": "Short version",
  "privacy.shortBody": "This dashboard is a client-side app. We do not run a database, we do not have user accounts, and we do not collect personal information. Your app list and status history never leave your browser.",
  "privacy.localHeading": "What stays in your browser",
  "privacy.local1": "The list of Marketplace apps you add (vendor name, status URL, logo URL).",
  "privacy.local2": "Health-check history for each app (last 30 results per app).",
  "privacy.local3": "Theme, language and refresh-interval preferences.",
  "privacy.localFooter": "All of the above is stored exclusively in your browser's localStorage. Clearing site data removes it permanently.",
  "privacy.serverHeading": "What our server does",
  "privacy.serverBody1": "When the dashboard checks app health, your browser POSTs the app list to our /api/status endpoint, which fetches each vendor's public status page on your behalf and returns the parsed result. We do this server-side because most vendor status pages do not allow cross-origin requests from browsers.",
  "privacy.serverBody2": "The server keeps no logs of your app list or fetch responses beyond short-lived runtime memory used to honour the request. We do not write your data to disk, share it with third parties, or use it for analytics.",
  "privacy.ipHeading": "IP processing for rate limiting",
  "privacy.ipBody": "Your IP address is processed transiently in server memory for per-IP rate limiting (60 seconds, 600 requests per window). It is not persisted to disk, written to access logs, or shared with third parties. Entries expire automatically.",
  "privacy.cookiesHeading": "Cookies & tracking",
  "privacy.cookiesBody": "We do not set cookies. We do not run third-party analytics or advertising trackers. The only client-side storage is the localStorage described above.",
  "privacy.contactHeading": "Contact",
  "privacy.contactBody": "Questions about this policy? Open an issue on the project's GitHub repository or reach out via the contact link in the repository README.",
  "privacy.back": "← Back to dashboard",

  // Terms page
  "terms.title": "Terms of Service",
  "terms.lastUpdated": "Last updated: 2026-05-03",
  "terms.serviceHeading": "Service",
  "terms.serviceBody": "This dashboard is a free, ad-free service that aggregates publicly available status information from Atlassian Marketplace vendors. It is provided as-is, with no warranty of any kind.",
  "terms.affilHeading": "No affiliation with Atlassian",
  "terms.affilBody": "This service is an independent project. It is not affiliated with, endorsed by, or sponsored by Atlassian Pty Ltd. “Jira”, “Confluence”, “Atlassian”, and product names of third-party Marketplace vendors are trademarks of their respective owners.",
  "terms.accuracyHeading": "Data accuracy",
  "terms.accuracyBody": "Status information is fetched from each vendor's public status page. We do our best to map vendor identities to status URLs correctly, but we cannot guarantee the accuracy or freshness of third-party data. Always confirm critical incidents with the vendor's own status page.",
  "terms.useHeading": "Acceptable use",
  "terms.useIntro": "You agree not to:",
  "terms.useBullet1": "Use the service to probe or attack third-party systems.",
  "terms.useBullet2": "Submit malformed or excessive requests intended to disrupt the service.",
  "terms.useBullet3": "Reverse-engineer the service for the purpose of replicating its proxying behaviour at scale.",
  "terms.useFooter": "We reserve the right to rate-limit or block clients that abuse the service.",
  "terms.liabilityHeading": "Liability",
  "terms.liabilityBody": "To the maximum extent permitted by law, the operators of this service are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the service or reliance on the information it displays.",
  "terms.changesHeading": "Changes",
  "terms.changesBody": "These terms may change as the service evolves. The “Last updated” date at the top of this page reflects the current version. Continued use after changes constitutes acceptance.",
  "terms.back": "← Back to dashboard",
};

const ja: Translations = {
  // Common
  "common.cancel": "キャンセル",
  "common.remove": "削除",
  "common.back": "戻る",
  "common.added": "追加済み",
  "common.close": "閉じる",
  "common.help": "ヘルプ",
  "common.language": "言語",

  // Header
  "header.title": "Marketplace アプリ稼働状況",
  "header.subtitle": "Jira / Confluence のサードパーティアプリのリアルタイム稼働状況。",
  "header.lastChecked": "最終確認 {time}",
  "header.disclaimer": "独立プロジェクトです — Atlassian とは無関係です。",
  "header.refresh": "更新",
  "header.exportTooltip": "アプリ一覧をエクスポート",
  "header.quickSetup": "クイック設定",
  "header.addApp": "アプリを追加",
  "header.howToUse": "使い方",

  // Status
  "status.operational": "正常",
  "status.degraded": "一部不安定",
  "status.outage": "障害",
  "status.monitored": "{n} 件監視中",

  // Empty state
  "empty.title": "監視中のアプリはありません",
  "empty.body": "厳選された人気アプリから選ぶか、Marketplace を検索してください。",

  // Table
  "table.app": "アプリ",
  "table.vendor": "ベンダー",
  "table.status": "状態",
  "table.history": "履歴(直近 {n})",
  "table.response": "応答",
  "table.checked": "確認時刻",
  "table.noStatusPage": "ステータスページなし",

  // Onboarding
  "onboarding.title": "ステータスダッシュボードへようこそ",
  "onboarding.description": "利用中のすべての Marketplace アプリの稼働状況を監視できます。",
  "onboarding.f1Title": "クイック設定",
  "onboarding.f1Body": "厳選された人気アプリから始められます。ステータス URL はベンダーごとに自動検出され、手動入力は不要です。",
  "onboarding.f2Title": "手動でアプリを追加",
  "onboarding.f2Body": "Marketplace を名前で検索したり、未登録ベンダーのカスタムステータスページ URL を貼り付けることもできます。",
  "onboarding.f3Title": "リアルタイム監視",
  "onboarding.f3Body": "即時チェック、または自動更新を設定できます。認証は不要です。",
  "onboarding.f4Title": "履歴と稼働率",
  "onboarding.f4Body": "ハートビートバーで最近の稼働傾向を可視化。すべてのデータはブラウザにローカル保存されます。",
  "onboarding.privacyNote": "プライバシー: アプリと履歴はすべてブラウザの localStorage にのみ保存されます。ベンダーのステータス API 呼び出し以外、外部に送信されることはありません。",
  "onboarding.getStarted": "始める",

  // Add app dialog
  "addApp.title": "Atlassian Marketplace からアプリを追加",
  "addApp.description": "検索してクリックするだけ — ステータス URL はベンダーごとに自動検出されます。",
  "addApp.placeholder": "アプリ名を入力(例: draw.io、Zephyr、Tempo…)",
  "addApp.hint": "Marketplace を検索するには 2 文字以上入力してください。",
  "addApp.empty": "「{q}」に該当するアプリが見つかりません。",
  "addApp.autoBadge": "自動",
  "addApp.noUrlBadge": "URL なし",
  "addApp.urlLabel": "ステータスページ URL",
  "addApp.urlOptional": "(任意)",
  "addApp.urlHint": "ベンダーの /api/v2/status.json または /summary.json エンドポイントを貼り付けてください。空欄のまま監視なしで追加することもできます。",
  "addApp.addWithoutUrl": "URL なしで追加",
  "addApp.addWithUrl": "URL ありで追加 →",
  "addApp.legendAuto": "ステータス URL が既知ベンダーに紐づいています。",
  "addApp.legendNoUrl": "クリックしてカスタム URL を入力するか、監視なしで追加します。",

  // Quick setup
  "quickSetup.title": "クイック設定",
  "quickSetup.description": "人気の Marketplace アプリから選択します。ステータス URL はベンダーごとに事前マッピング済みです。",
  "quickSetup.selectAll": "すべて選択",
  "quickSetup.deselectAll": "選択を解除",
  "quickSetup.add": "{n} 件追加",
  "quickSetup.loading": "人気アプリを読み込み中…",
  "quickSetup.error": "人気アプリを読み込めませんでした。後ほど再度お試しください。",

  // Delete
  "delete.title": "アプリを削除",
  "delete.body": "{name} をダッシュボードから削除しますか? 履歴も同時に削除されます。",

  // Footer
  "footer.line": "Marketplace App Status — 独立プロジェクト、Atlassian とは無関係です。",
  "footer.privacy": "プライバシー",
  "footer.terms": "利用規約",

  // Theme
  "theme.toLight": "ライトモードに切替",
  "theme.toDark": "ダークモードに切替",

  // Privacy
  "privacy.title": "プライバシーポリシー",
  "privacy.lastUpdated": "最終更新日: 2026-05-03",
  "privacy.shortHeading": "概要",
  "privacy.shortBody": "本ダッシュボードはクライアントサイドアプリです。データベースを保持せず、ユーザーアカウントもなく、個人情報も収集しません。アプリ一覧やステータス履歴がブラウザの外に出ることはありません。",
  "privacy.localHeading": "ブラウザ内に保存される情報",
  "privacy.local1": "追加した Marketplace アプリ一覧(ベンダー名、ステータス URL、ロゴ URL)。",
  "privacy.local2": "各アプリのヘルスチェック履歴(アプリごとに直近 30 件)。",
  "privacy.local3": "テーマ、言語、自動更新間隔の設定。",
  "privacy.localFooter": "上記はすべてブラウザの localStorage にのみ保存されます。サイトデータを削除すると永久に消去されます。",
  "privacy.serverHeading": "サーバー側で行うこと",
  "privacy.serverBody1": "ヘルスチェック実行時、ブラウザは /api/status エンドポイントにアプリ一覧を POST し、サーバーが各ベンダーの公開ステータスページを取得して結果を返します。多くのベンダーステータスページがブラウザからのクロスオリジン要求を許可しないため、サーバー経由で取得しています。",
  "privacy.serverBody2": "サーバーは要求処理に必要な短時間のメモリ以外、アプリ一覧や取得結果を保持しません。ディスク書き込み、第三者共有、分析利用はいずれも行いません。",
  "privacy.ipHeading": "レート制限のための IP 処理",
  "privacy.ipBody": "IP アドレスは、IP ごとのレート制限(60 秒間に 600 リクエスト)のためにサーバーメモリ上で一時的に処理されます。ディスクに永続化したり、アクセスログに記録したり、第三者と共有することはありません。エントリは自動的に期限切れとなります。",
  "privacy.cookiesHeading": "Cookie とトラッキング",
  "privacy.cookiesBody": "Cookie は使用しません。第三者の分析や広告トラッカーも導入していません。クライアントサイドの保存先は上記の localStorage のみです。",
  "privacy.contactHeading": "お問い合わせ",
  "privacy.contactBody": "本ポリシーに関するお問い合わせは、プロジェクトの GitHub リポジトリで Issue を作成いただくか、リポジトリ README の連絡先からご連絡ください。",
  "privacy.back": "← ダッシュボードに戻る",

  // Terms
  "terms.title": "利用規約",
  "terms.lastUpdated": "最終更新日: 2026-05-03",
  "terms.serviceHeading": "サービス",
  "terms.serviceBody": "本サービスは、Atlassian Marketplace の各ベンダーが公開するステータス情報を集約して表示する、無料・広告なしのサービスです。現状有姿(as-is)で提供され、いかなる保証もありません。",
  "terms.affilHeading": "Atlassian との関係",
  "terms.affilBody": "本サービスは独立したプロジェクトであり、Atlassian Pty Ltd. と提携、推奨、後援を受けるものではありません。「Jira」「Confluence」「Atlassian」、および第三者ベンダーの製品名はそれぞれの所有者の商標です。",
  "terms.accuracyHeading": "データの正確性",
  "terms.accuracyBody": "ステータス情報は各ベンダーの公開ステータスページから取得します。ベンダー識別子とステータス URL の対応付けには細心の注意を払いますが、第三者データの正確性や鮮度は保証できません。重要なインシデントは必ずベンダー本家のステータスページでもご確認ください。",
  "terms.useHeading": "利用に関するルール",
  "terms.useIntro": "以下の行為は禁止します:",
  "terms.useBullet1": "本サービスを用いて第三者システムを探索または攻撃する行為。",
  "terms.useBullet2": "サービス妨害を目的とした不正または過剰なリクエストの送信。",
  "terms.useBullet3": "プロキシ動作を大規模に複製する目的でのリバースエンジニアリング。",
  "terms.useFooter": "悪用するクライアントに対しては、レート制限やブロックを実施することがあります。",
  "terms.liabilityHeading": "免責",
  "terms.liabilityBody": "法令で許容される最大限の範囲において、本サービスの運営者は、本サービスの利用または表示情報への信頼から生じる直接的・間接的・付随的・結果的な損害について一切責任を負いません。",
  "terms.changesHeading": "変更",
  "terms.changesBody": "サービスの進化に伴い本規約は変更されることがあります。本ページ冒頭の「最終更新日」が現在のバージョンを示します。変更後の継続利用は本規約への同意とみなされます。",
  "terms.back": "← ダッシュボードに戻る",
};

const de: Translations = {
  // Common
  "common.cancel": "Abbrechen",
  "common.remove": "Entfernen",
  "common.back": "Zurück",
  "common.added": "Hinzugefügt",
  "common.close": "Schließen",
  "common.help": "Hilfe",
  "common.language": "Sprache",

  // Header
  "header.title": "Marketplace-App-Status",
  "header.subtitle": "Echtzeit-Statusüberwachung für Drittanbieter-Apps in Jira & Confluence.",
  "header.lastChecked": "Zuletzt geprüft {time}",
  "header.disclaimer": "Unabhängiges Projekt — nicht mit Atlassian verbunden.",
  "header.refresh": "Aktualisieren",
  "header.exportTooltip": "App-Liste exportieren",
  "header.quickSetup": "Schnellstart",
  "header.addApp": "App hinzufügen",
  "header.howToUse": "Anleitung",

  // Status
  "status.operational": "Betriebsbereit",
  "status.degraded": "Eingeschränkt",
  "status.outage": "Ausfall",
  "status.monitored": "{n} überwacht",

  // Empty state
  "empty.title": "Keine Apps überwacht",
  "empty.body": "Wählen Sie aus einer kuratierten Liste oder durchsuchen Sie den Marketplace.",

  // Table
  "table.app": "App",
  "table.vendor": "Anbieter",
  "table.status": "Status",
  "table.history": "Verlauf (letzte {n})",
  "table.response": "Antwort",
  "table.checked": "Geprüft",
  "table.noStatusPage": "Keine Statusseite",

  // Onboarding
  "onboarding.title": "Willkommen im Status-Dashboard",
  "onboarding.description": "Überwachen Sie die Verfügbarkeit aller Marketplace-Apps, auf die Sie sich verlassen.",
  "onboarding.f1Title": "Schnellstart",
  "onboarding.f1Body": "Beginnen Sie mit kuratierten beliebten Apps — Status-URLs werden pro Anbieter automatisch erkannt. Keine manuelle Eingabe nötig.",
  "onboarding.f2Title": "Apps manuell hinzufügen",
  "onboarding.f2Body": "Durchsuchen Sie den Marketplace per Namen oder fügen Sie eigene Status-Page-URLs für nicht gelistete Anbieter ein.",
  "onboarding.f3Title": "Echtzeit-Status",
  "onboarding.f3Body": "Sofortprüfung oder automatische Aktualisierung. Keine Authentifizierung erforderlich.",
  "onboarding.f4Title": "Verlauf & Verfügbarkeit",
  "onboarding.f4Body": "Heartbeat-Balken zeigen aktuelle Verfügbarkeitstrends. Alle Daten werden lokal in Ihrem Browser gespeichert.",
  "onboarding.privacyNote": "Datenschutz: Alle Apps und Verlaufsdaten werden ausschließlich im localStorage Ihres Browsers gespeichert. Außer Aufrufen der Anbieter-Status-APIs wird nichts an externe Server gesendet.",
  "onboarding.getStarted": "Loslegen",

  // Add app
  "addApp.title": "App vom Atlassian Marketplace hinzufügen",
  "addApp.description": "Suchen und klicken — Status-URL wird pro Anbieter automatisch ermittelt, keine manuelle Eingabe nötig.",
  "addApp.placeholder": "App-Namen eingeben (z. B. draw.io, Zephyr, Tempo…)",
  "addApp.hint": "Mindestens 2 Zeichen eingeben, um den Marketplace zu durchsuchen.",
  "addApp.empty": "Keine Apps für „{q}“ gefunden.",
  "addApp.autoBadge": "Auto",
  "addApp.noUrlBadge": "Keine URL",
  "addApp.urlLabel": "Status-Page-URL",
  "addApp.urlOptional": "(optional)",
  "addApp.urlHint": "Fügen Sie den /api/v2/status.json- oder /summary.json-Endpunkt des Anbieters ein. Leer lassen, um ohne Überwachung hinzuzufügen.",
  "addApp.addWithoutUrl": "Ohne URL hinzufügen",
  "addApp.addWithUrl": "Mit URL hinzufügen →",
  "addApp.legendAuto": "Status-URL ist einem bekannten Anbieter zugeordnet.",
  "addApp.legendNoUrl": "Klicken, um eine eigene URL einzugeben oder ohne Überwachung hinzuzufügen.",

  // Quick setup
  "quickSetup.title": "Schnellstart",
  "quickSetup.description": "Wählen Sie beliebte Marketplace-Apps. Status-URLs sind pro Anbieter vorab zugeordnet.",
  "quickSetup.selectAll": "Alle auswählen",
  "quickSetup.deselectAll": "Auswahl aufheben",
  "quickSetup.add": "{n} hinzufügen",
  "quickSetup.loading": "Beliebte Apps werden geladen…",
  "quickSetup.error": "Beliebte Apps konnten nicht geladen werden. Bitte später erneut versuchen.",

  // Delete
  "delete.title": "App entfernen",
  "delete.body": "{name} aus Ihrem Dashboard entfernen? Der Verlauf wird ebenfalls gelöscht.",

  // Footer
  "footer.line": "Marketplace App Status — unabhängiges Projekt, nicht mit Atlassian verbunden.",
  "footer.privacy": "Datenschutz",
  "footer.terms": "Nutzungsbedingungen",

  // Theme
  "theme.toLight": "Zum hellen Modus wechseln",
  "theme.toDark": "Zum dunklen Modus wechseln",

  // Privacy
  "privacy.title": "Datenschutzerklärung",
  "privacy.lastUpdated": "Zuletzt aktualisiert: 03.05.2026",
  "privacy.shortHeading": "Kurzfassung",
  "privacy.shortBody": "Dieses Dashboard ist eine Client-Side-Anwendung. Wir betreiben keine Datenbank, haben keine Nutzerkonten und erheben keine personenbezogenen Daten. Ihre App-Liste und Statushistorie verlassen Ihren Browser nicht.",
  "privacy.localHeading": "Was im Browser bleibt",
  "privacy.local1": "Die Liste der hinzugefügten Marketplace-Apps (Anbietername, Status-URL, Logo-URL).",
  "privacy.local2": "Health-Check-Verlauf je App (letzte 30 Ergebnisse pro App).",
  "privacy.local3": "Theme-, Sprach- und Aktualisierungsintervall-Einstellungen.",
  "privacy.localFooter": "All das wird ausschließlich im localStorage Ihres Browsers gespeichert. Das Löschen der Site-Daten entfernt es endgültig.",
  "privacy.serverHeading": "Was unser Server tut",
  "privacy.serverBody1": "Bei einem Health-Check sendet Ihr Browser die App-Liste per POST an unseren /api/status-Endpunkt, der jede öffentliche Anbieter-Statusseite stellvertretend abruft und das Ergebnis zurückgibt. Wir tun das serverseitig, weil die meisten Statusseiten keine Cross-Origin-Anfragen aus Browsern erlauben.",
  "privacy.serverBody2": "Der Server speichert keine Logs Ihrer App-Liste oder Antworten über kurzlebigen Laufzeitspeicher hinaus. Wir schreiben Ihre Daten nicht auf die Festplatte, geben sie nicht weiter und nutzen sie nicht für Analytics.",
  "privacy.ipHeading": "IP-Verarbeitung zur Rate-Begrenzung",
  "privacy.ipBody": "Ihre IP-Adresse wird kurzzeitig im Server-Speicher verarbeitet, um pro IP eine Rate-Begrenzung durchzusetzen (60 Sekunden, 600 Anfragen pro Fenster). Sie wird nicht persistent gespeichert, nicht in Access-Logs geschrieben und nicht an Dritte weitergegeben. Einträge laufen automatisch ab.",
  "privacy.cookiesHeading": "Cookies & Tracking",
  "privacy.cookiesBody": "Wir setzen keine Cookies. Wir verwenden keine Drittanbieter-Analyse oder Werbe-Tracker. Der einzige clientseitige Speicher ist das oben beschriebene localStorage.",
  "privacy.contactHeading": "Kontakt",
  "privacy.contactBody": "Fragen zu dieser Erklärung? Eröffnen Sie ein Issue im GitHub-Repository des Projekts oder nutzen Sie den Kontakt-Link in der README.",
  "privacy.back": "← Zurück zum Dashboard",

  // Terms
  "terms.title": "Nutzungsbedingungen",
  "terms.lastUpdated": "Zuletzt aktualisiert: 03.05.2026",
  "terms.serviceHeading": "Dienst",
  "terms.serviceBody": "Dieser Dienst ist ein kostenloses, werbefreies Dashboard, das öffentlich verfügbare Statusinformationen von Atlassian-Marketplace-Anbietern aggregiert. Bereitstellung erfolgt „wie besehen“, ohne jegliche Gewährleistung.",
  "terms.affilHeading": "Keine Verbindung zu Atlassian",
  "terms.affilBody": "Dieser Dienst ist ein unabhängiges Projekt. Er steht in keiner Verbindung zu, wird nicht unterstützt von oder gesponsert von Atlassian Pty Ltd. „Jira“, „Confluence“, „Atlassian“ sowie Produktnamen Dritter sind Marken der jeweiligen Inhaber.",
  "terms.accuracyHeading": "Datengenauigkeit",
  "terms.accuracyBody": "Statusinformationen werden von der jeweiligen öffentlichen Statusseite des Anbieters abgerufen. Wir bemühen uns um korrekte Zuordnung, können jedoch Genauigkeit und Aktualität von Drittanbieterdaten nicht garantieren. Bestätigen Sie kritische Vorfälle stets über die Statusseite des Anbieters.",
  "terms.useHeading": "Akzeptable Nutzung",
  "terms.useIntro": "Sie verpflichten sich, Folgendes nicht zu tun:",
  "terms.useBullet1": "Den Dienst nutzen, um Drittsysteme zu sondieren oder anzugreifen.",
  "terms.useBullet2": "Fehlerhafte oder übermäßige Anfragen senden, die den Dienst stören sollen.",
  "terms.useBullet3": "Den Dienst zurückentwickeln, um sein Proxy-Verhalten in großem Maßstab nachzubilden.",
  "terms.useFooter": "Wir behalten uns das Recht vor, Clients, die den Dienst missbrauchen, zu drosseln oder zu blockieren.",
  "terms.liabilityHeading": "Haftung",
  "terms.liabilityBody": "Im gesetzlich zulässigen Höchstmaß haften die Betreiber des Dienstes nicht für direkte, indirekte, zufällige oder Folgeschäden, die aus der Nutzung des Dienstes oder dem Vertrauen auf die angezeigten Informationen entstehen.",
  "terms.changesHeading": "Änderungen",
  "terms.changesBody": "Diese Bedingungen können sich mit der Weiterentwicklung des Dienstes ändern. Das Datum „Zuletzt aktualisiert“ oben spiegelt die aktuelle Version wider. Die fortgesetzte Nutzung gilt als Zustimmung.",
  "terms.back": "← Zurück zum Dashboard",
};

const ko: Translations = {
  // Common
  "common.cancel": "취소",
  "common.remove": "삭제",
  "common.back": "뒤로",
  "common.added": "추가됨",
  "common.close": "닫기",
  "common.help": "도움말",
  "common.language": "언어",

  // Header
  "header.title": "Marketplace 앱 상태",
  "header.subtitle": "Jira·Confluence 서드파티 앱의 실시간 서비스 상태.",
  "header.lastChecked": "마지막 확인 {time}",
  "header.disclaimer": "독립 프로젝트 — Atlassian과 무관합니다.",
  "header.refresh": "새로고침",
  "header.exportTooltip": "앱 목록 내보내기",
  "header.quickSetup": "빠른 설정",
  "header.addApp": "앱 추가",
  "header.howToUse": "사용 방법",

  // Status
  "status.operational": "정상",
  "status.degraded": "성능 저하",
  "status.outage": "장애",
  "status.monitored": "{n}개 모니터링 중",

  // Empty state
  "empty.title": "모니터링 중인 앱이 없습니다",
  "empty.body": "추천 목록에서 팀이 사용하는 앱을 선택하거나 Marketplace에서 검색하세요.",

  // Table
  "table.app": "앱",
  "table.vendor": "벤더",
  "table.status": "상태",
  "table.history": "기록 (최근 {n})",
  "table.response": "응답",
  "table.checked": "확인 시각",
  "table.noStatusPage": "상태 페이지 없음",

  // Onboarding
  "onboarding.title": "Status Dashboard에 오신 것을 환영합니다",
  "onboarding.description": "사용 중인 모든 Marketplace 앱의 상태를 한 곳에서 확인하세요.",
  "onboarding.f1Title": "빠른 설정",
  "onboarding.f1Body": "선별된 인기 앱부터 시작하세요. 벤더별 상태 URL이 자동 매핑되어 수동 입력이 필요 없습니다.",
  "onboarding.f2Title": "앱 직접 추가",
  "onboarding.f2Body": "Marketplace를 이름으로 검색하거나, 등록되지 않은 벤더의 커스텀 상태 페이지 URL을 붙여넣으세요.",
  "onboarding.f3Title": "실시간 상태",
  "onboarding.f3Body": "즉시 확인 또는 자동 새로고침을 설정할 수 있습니다. 인증은 필요하지 않습니다.",
  "onboarding.f4Title": "기록 및 가용성",
  "onboarding.f4Body": "Heartbeat 막대로 최근 가동률 추세를 확인하세요. 모든 데이터는 브라우저에 로컬 저장됩니다.",
  "onboarding.privacyNote": "프라이버시: 앱과 기록은 모두 브라우저의 localStorage에만 저장됩니다. 벤더 상태 API 호출 외에는 외부 서버로 전송되는 정보가 없습니다.",
  "onboarding.getStarted": "시작하기",

  // Add app
  "addApp.title": "Atlassian Marketplace에서 앱 추가",
  "addApp.description": "검색 후 클릭하면 추가됩니다 — 상태 URL은 벤더별로 자동 인식되어 수동 입력이 필요 없습니다.",
  "addApp.placeholder": "앱 이름 입력 (예: draw.io, Zephyr, Tempo…)",
  "addApp.hint": "Marketplace를 검색하려면 2자 이상 입력하세요.",
  "addApp.empty": "「{q}」에 해당하는 앱이 없습니다.",
  "addApp.autoBadge": "자동",
  "addApp.noUrlBadge": "URL 없음",
  "addApp.urlLabel": "상태 페이지 URL",
  "addApp.urlOptional": "(선택)",
  "addApp.urlHint": "벤더의 /api/v2/status.json 또는 /summary.json 엔드포인트를 붙여넣으세요. 비워두면 모니터링 없이 추가됩니다.",
  "addApp.addWithoutUrl": "URL 없이 추가",
  "addApp.addWithUrl": "URL과 함께 추가 →",
  "addApp.legendAuto": "상태 URL이 알려진 벤더와 매핑되어 있습니다.",
  "addApp.legendNoUrl": "클릭하여 커스텀 URL을 입력하거나 모니터링 없이 추가하세요.",

  // Quick setup
  "quickSetup.title": "빠른 설정",
  "quickSetup.description": "인기 Marketplace 앱을 선택하세요. 상태 URL은 벤더별로 사전 매핑되어 있습니다.",
  "quickSetup.selectAll": "모두 선택",
  "quickSetup.deselectAll": "선택 해제",
  "quickSetup.add": "{n}개 추가",
  "quickSetup.loading": "인기 앱 불러오는 중…",
  "quickSetup.error": "인기 앱을 불러오지 못했습니다. 잠시 후 다시 시도하세요.",

  // Delete
  "delete.title": "앱 삭제",
  "delete.body": "{name}을(를) 대시보드에서 삭제할까요? 기록도 함께 삭제됩니다.",

  // Footer
  "footer.line": "Marketplace App Status — 독립 프로젝트, Atlassian과 무관합니다.",
  "footer.privacy": "개인정보처리방침",
  "footer.terms": "이용약관",

  // Theme
  "theme.toLight": "라이트 모드로 전환",
  "theme.toDark": "다크 모드로 전환",

  // Privacy
  "privacy.title": "개인정보처리방침",
  "privacy.lastUpdated": "최종 업데이트: 2026-05-03",
  "privacy.shortHeading": "요약",
  "privacy.shortBody": "본 대시보드는 클라이언트 사이드 앱입니다. 데이터베이스를 운영하지 않으며 사용자 계정도 없고, 개인정보를 수집하지 않습니다. 앱 목록과 상태 기록은 브라우저 밖으로 나가지 않습니다.",
  "privacy.localHeading": "브라우저에만 저장되는 정보",
  "privacy.local1": "추가하신 Marketplace 앱 목록 (벤더명, 상태 URL, 로고 URL).",
  "privacy.local2": "각 앱의 상태 점검 기록 (앱당 최근 30건).",
  "privacy.local3": "테마·언어·자동 새로고침 설정.",
  "privacy.localFooter": "위 정보는 모두 브라우저 localStorage에만 저장됩니다. 사이트 데이터를 삭제하면 영구적으로 삭제됩니다.",
  "privacy.serverHeading": "서버에서 하는 일",
  "privacy.serverBody1": "상태 점검 시 브라우저는 /api/status 엔드포인트로 앱 목록을 POST하며, 서버는 각 벤더의 공개 상태 페이지를 대신 호출하고 결과를 반환합니다. 대부분의 벤더 상태 페이지가 브라우저의 cross-origin 요청을 허용하지 않기 때문에 서버 경유로 처리합니다.",
  "privacy.serverBody2": "서버는 요청 처리에 필요한 단기 메모리 외에는 앱 목록이나 응답 결과를 저장하지 않습니다. 디스크에 기록하거나 제3자에 공유하거나 분석에 활용하지 않습니다.",
  "privacy.ipHeading": "레이트 리밋을 위한 IP 처리",
  "privacy.ipBody": "IP 주소는 IP별 레이트 리밋(60초 동안 600회 요청)을 위해 서버 메모리에서 일시적으로 처리됩니다. 디스크에 영구 저장하거나 액세스 로그에 기록하거나 제3자와 공유하지 않습니다. 항목은 자동으로 만료됩니다.",
  "privacy.cookiesHeading": "쿠키·트래킹",
  "privacy.cookiesBody": "쿠키를 설정하지 않습니다. 제3자 분석·광고 트래커도 사용하지 않습니다. 클라이언트 측 저장소는 위에서 설명한 localStorage뿐입니다.",
  "privacy.contactHeading": "문의",
  "privacy.contactBody": "본 방침에 대한 문의는 프로젝트 GitHub 저장소에 이슈를 등록하시거나 README의 연락처로 연락 주십시오.",
  "privacy.back": "← 대시보드로 돌아가기",

  // Terms
  "terms.title": "이용약관",
  "terms.lastUpdated": "최종 업데이트: 2026-05-03",
  "terms.serviceHeading": "서비스",
  "terms.serviceBody": "본 서비스는 Atlassian Marketplace 벤더의 공개 상태 정보를 집계하여 보여주는 무료·광고 없는 대시보드입니다. 어떠한 보증 없이 “현 상태 그대로(as-is)” 제공됩니다.",
  "terms.affilHeading": "Atlassian과의 관계",
  "terms.affilBody": "본 서비스는 독립 프로젝트입니다. Atlassian Pty Ltd.와 제휴, 후원, 협력 관계가 없습니다. “Jira”, “Confluence”, “Atlassian” 및 제3자 벤더 제품명은 각 권리자의 상표입니다.",
  "terms.accuracyHeading": "데이터 정확성",
  "terms.accuracyBody": "상태 정보는 각 벤더의 공개 상태 페이지에서 가져옵니다. 벤더 식별과 상태 URL 매핑에 최선을 다하지만, 제3자 데이터의 정확성·신선도는 보장하지 않습니다. 중요한 인시던트는 반드시 벤더 본가의 상태 페이지에서 재확인하시기 바랍니다.",
  "terms.useHeading": "허용되는 사용",
  "terms.useIntro": "다음 행위는 금지됩니다:",
  "terms.useBullet1": "본 서비스를 사용해 제3자 시스템을 탐사하거나 공격하는 행위.",
  "terms.useBullet2": "서비스 방해를 목적으로 한 잘못되거나 과도한 요청 전송.",
  "terms.useBullet3": "프록시 동작을 대규모로 복제할 목적의 리버스 엔지니어링.",
  "terms.useFooter": "서비스를 남용하는 클라이언트에 대해 레이트 리밋이나 차단을 적용할 권리를 보유합니다.",
  "terms.liabilityHeading": "책임 제한",
  "terms.liabilityBody": "법령이 허용하는 최대 범위에서, 본 서비스 운영자는 서비스 사용 또는 표시된 정보에 대한 신뢰로 인해 발생하는 직접·간접·부수적·결과적 손해에 대해 책임을 지지 않습니다.",
  "terms.changesHeading": "변경",
  "terms.changesBody": "서비스 발전에 따라 본 약관은 변경될 수 있습니다. 본 페이지 상단의 “최종 업데이트”가 현재 버전을 나타냅니다. 변경 후 계속 사용은 약관 동의로 간주됩니다.",
  "terms.back": "← 대시보드로 돌아가기",
};

const fr: Translations = {
  // Common
  "common.cancel": "Annuler",
  "common.remove": "Supprimer",
  "common.back": "Retour",
  "common.added": "Ajouté",
  "common.close": "Fermer",
  "common.help": "Aide",
  "common.language": "Langue",

  // Header
  "header.title": "État des apps Marketplace",
  "header.subtitle": "Disponibilité en temps réel des apps tierces Jira & Confluence.",
  "header.lastChecked": "Dernière vérification {time}",
  "header.disclaimer": "Projet indépendant — non affilié à Atlassian.",
  "header.refresh": "Actualiser",
  "header.exportTooltip": "Exporter la liste",
  "header.quickSetup": "Configuration rapide",
  "header.addApp": "Ajouter une app",
  "header.howToUse": "Mode d'emploi",

  // Status
  "status.operational": "Opérationnel",
  "status.degraded": "Dégradé",
  "status.outage": "Panne",
  "status.monitored": "{n} suivies",

  // Empty
  "empty.title": "Aucune app suivie",
  "empty.body": "Choisissez parmi une liste sélectionnée ou recherchez sur le Marketplace.",

  // Table
  "table.app": "App",
  "table.vendor": "Éditeur",
  "table.status": "État",
  "table.history": "Historique ({n} dernières)",
  "table.response": "Réponse",
  "table.checked": "Vérifiée",
  "table.noStatusPage": "Pas de page de statut",

  // Onboarding
  "onboarding.title": "Bienvenue sur le Status Dashboard",
  "onboarding.description": "Surveillez la disponibilité de toutes les apps Marketplace dont vous dépendez.",
  "onboarding.f1Title": "Configuration rapide",
  "onboarding.f1Body": "Démarrez avec des apps populaires sélectionnées — les URL de statut sont détectées automatiquement par éditeur. Aucune saisie manuelle nécessaire.",
  "onboarding.f2Title": "Ajout manuel d'apps",
  "onboarding.f2Body": "Recherchez le Marketplace par nom ou collez une URL de page de statut personnalisée pour les éditeurs non listés.",
  "onboarding.f3Title": "Statut en temps réel",
  "onboarding.f3Body": "Vérification immédiate ou rafraîchissement automatique. Aucune authentification requise.",
  "onboarding.f4Title": "Historique & disponibilité",
  "onboarding.f4Body": "Les barres heartbeat affichent les tendances de disponibilité récentes. Toutes les données sont stockées localement dans votre navigateur.",
  "onboarding.privacyNote": "Confidentialité : toutes les apps et l'historique sont stockés uniquement dans le localStorage de votre navigateur. Rien n'est envoyé à des serveurs externes hormis les appels aux API de statut des éditeurs.",
  "onboarding.getStarted": "Commencer",

  // Add app
  "addApp.title": "Ajouter une app depuis l'Atlassian Marketplace",
  "addApp.description": "Rechercher et cliquer pour ajouter — l'URL de statut est détectée automatiquement par éditeur.",
  "addApp.placeholder": "Saisissez le nom (ex. draw.io, Zephyr, Tempo…)",
  "addApp.hint": "Saisissez au moins 2 caractères pour rechercher.",
  "addApp.empty": "Aucune app trouvée pour « {q} ».",
  "addApp.autoBadge": "Auto",
  "addApp.noUrlBadge": "Sans URL",
  "addApp.urlLabel": "URL de la page de statut",
  "addApp.urlOptional": "(optionnel)",
  "addApp.urlHint": "Collez l'endpoint /api/v2/status.json ou /summary.json de l'éditeur. Laissez vide pour ajouter sans surveillance.",
  "addApp.addWithoutUrl": "Ajouter sans URL",
  "addApp.addWithUrl": "Ajouter avec URL →",
  "addApp.legendAuto": "URL de statut associée à un éditeur connu.",
  "addApp.legendNoUrl": "Cliquez pour saisir une URL personnalisée ou ajouter sans surveillance.",

  // Quick setup
  "quickSetup.title": "Configuration rapide",
  "quickSetup.description": "Choisissez parmi les apps Marketplace populaires. Les URL de statut sont pré-mappées par éditeur.",
  "quickSetup.selectAll": "Tout sélectionner",
  "quickSetup.deselectAll": "Tout désélectionner",
  "quickSetup.add": "Ajouter {n}",
  "quickSetup.loading": "Chargement des apps populaires…",
  "quickSetup.error": "Impossible de charger les apps populaires. Réessayez plus tard.",

  // Delete
  "delete.title": "Supprimer l'app",
  "delete.body": "Supprimer {name} de votre dashboard ? Cela efface aussi son historique.",

  // Footer
  "footer.line": "Marketplace App Status — projet indépendant, non affilié à Atlassian.",
  "footer.privacy": "Confidentialité",
  "footer.terms": "Conditions",

  // Theme
  "theme.toLight": "Passer au mode clair",
  "theme.toDark": "Passer au mode sombre",

  // Privacy
  "privacy.title": "Politique de confidentialité",
  "privacy.lastUpdated": "Dernière mise à jour : 03/05/2026",
  "privacy.shortHeading": "Version courte",
  "privacy.shortBody": "Ce dashboard est une application côté client. Nous n'exécutons aucune base de données, n'avons pas de comptes utilisateurs et ne collectons aucune information personnelle. Votre liste d'apps et l'historique de statut ne quittent jamais votre navigateur.",
  "privacy.localHeading": "Ce qui reste dans votre navigateur",
  "privacy.local1": "La liste des apps Marketplace ajoutées (nom de l'éditeur, URL de statut, URL du logo).",
  "privacy.local2": "L'historique des contrôles de santé pour chaque app (30 derniers résultats par app).",
  "privacy.local3": "Préférences de thème, de langue et d'intervalle de rafraîchissement.",
  "privacy.localFooter": "Tout cela est stocké exclusivement dans le localStorage de votre navigateur. Effacer les données du site les supprime définitivement.",
  "privacy.serverHeading": "Ce que fait notre serveur",
  "privacy.serverBody1": "Lors d'un contrôle de santé, votre navigateur POST la liste d'apps à notre endpoint /api/status, qui récupère pour vous la page de statut publique de chaque éditeur et renvoie le résultat. Nous le faisons côté serveur car la plupart des pages de statut n'autorisent pas les requêtes cross-origin depuis le navigateur.",
  "privacy.serverBody2": "Le serveur ne conserve aucun journal de votre liste d'apps ni des réponses, en dehors d'une mémoire d'exécution éphémère utilisée pour traiter la requête. Nous n'écrivons pas vos données sur disque, ne les partageons pas avec des tiers et ne les utilisons pas pour des analytics.",
  "privacy.ipHeading": "Traitement de l'IP pour la limitation de débit",
  "privacy.ipBody": "Votre adresse IP est traitée temporairement en mémoire serveur pour la limitation de débit par IP (60 secondes, 600 requêtes par fenêtre). Elle n'est ni persistée sur disque, ni écrite dans des journaux d'accès, ni partagée avec des tiers. Les entrées expirent automatiquement.",
  "privacy.cookiesHeading": "Cookies & traceurs",
  "privacy.cookiesBody": "Nous ne plaçons aucun cookie. Nous n'utilisons aucun traceur d'analytics ou publicitaire tiers. Le seul stockage côté client est le localStorage décrit ci-dessus.",
  "privacy.contactHeading": "Contact",
  "privacy.contactBody": "Des questions sur cette politique ? Ouvrez un ticket sur le dépôt GitHub du projet ou utilisez le lien de contact dans le README.",
  "privacy.back": "← Retour au dashboard",

  // Terms
  "terms.title": "Conditions d'utilisation",
  "terms.lastUpdated": "Dernière mise à jour : 03/05/2026",
  "terms.serviceHeading": "Service",
  "terms.serviceBody": "Ce dashboard est un service gratuit et sans publicité qui agrège les informations de statut publiques des éditeurs de l'Atlassian Marketplace. Il est fourni « en l'état », sans aucune garantie.",
  "terms.affilHeading": "Pas d'affiliation avec Atlassian",
  "terms.affilBody": "Ce service est un projet indépendant. Il n'est pas affilié à, approuvé ou sponsorisé par Atlassian Pty Ltd. « Jira », « Confluence », « Atlassian » et les noms de produits d'éditeurs tiers sont des marques de leurs propriétaires respectifs.",
  "terms.accuracyHeading": "Exactitude des données",
  "terms.accuracyBody": "Les informations de statut proviennent de la page de statut publique de chaque éditeur. Nous faisons de notre mieux pour mapper correctement les éditeurs aux URL de statut, mais nous ne garantissons ni l'exactitude ni la fraîcheur des données tierces. Confirmez toujours les incidents critiques sur la page de statut officielle de l'éditeur.",
  "terms.useHeading": "Utilisation acceptable",
  "terms.useIntro": "Vous vous engagez à ne pas :",
  "terms.useBullet1": "Utiliser le service pour sonder ou attaquer des systèmes tiers.",
  "terms.useBullet2": "Soumettre des requêtes malformées ou excessives visant à perturber le service.",
  "terms.useBullet3": "Faire de la rétro-ingénierie pour reproduire à grande échelle son comportement de proxy.",
  "terms.useFooter": "Nous nous réservons le droit de limiter ou bloquer les clients qui abusent du service.",
  "terms.liabilityHeading": "Responsabilité",
  "terms.liabilityBody": "Dans toute la mesure permise par la loi, les opérateurs du service ne sont pas responsables des dommages directs, indirects, accessoires ou consécutifs découlant de l'utilisation du service ou de la confiance accordée aux informations affichées.",
  "terms.changesHeading": "Modifications",
  "terms.changesBody": "Ces conditions peuvent évoluer. La date de « dernière mise à jour » en haut de la page reflète la version actuelle. Une utilisation continue après modification vaut acceptation.",
  "terms.back": "← Retour au dashboard",
};

export const TRANSLATIONS: Record<Locale, Translations> = { en, ja, de, ko, fr };

export type TranslationKey = keyof typeof en;
