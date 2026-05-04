# Marketplace App Status

Jira · Confluence 서드파티 앱의 실시간 서비스 상태 대시보드 — 로그인, 데이터베이스, API 토큰 불필요.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-green)

**[라이브 데모](https://marketplace.yeachan.cloud)** · [이슈 제보](https://github.com/happy-yeachan/Marketplace-App-Status/issues) · [English](./README.md)

---

## 개요

Atlassian 자체 서비스는 상태 페이지가 있지만, 팀이 매일 사용하는 수백 개의 서드파티 Marketplace 앱 — ScriptRunner, Tempo, Zephyr, draw.io 등 — 은 각 벤더가 별도로 운영하는 상태 페이지를 가지고 있습니다. 장애 상황에서 URL을 찾아다니느라 몇 분을 낭비하게 됩니다.

**Marketplace App Status**는 모든 앱의 실시간 상태를 한 화면에 집약합니다. 응답 시간, 히트 히스토리, 즉각적인 장애 알림까지 — Atlassian 인스턴스에 손대지 않고.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| **빠른 설정** | 카테고리별로 분류된 인기 앱을 체크박스 하나로 일괄 추가. 상태 URL 자동 감지. |
| **Marketplace 검색** | 앱 이름으로 검색. 상태 URL을 서버 사이드에서 자동 해석. |
| **링크로 공유** | 앱 목록을 URL 하나로 공유. 수신자는 클릭 한 번으로 가져오기 가능. 목록 데이터는 `#share=` 해시에 Base64URL 인코딩되며 서버로 전송되지 않음. |
| **자동 탐색** | 정적 맵에 없는 벤더는 `status.vendor.com`, `vendor.statuspage.io` 등 일반적인 패턴을 병렬로 탐색해 상태 URL을 자동 발견. 페이지 이름 검증으로 오탐 방지. |
| **URL 자가 복구** | 벤더가 상태 페이지를 이전했을 때 DNS 실패를 감지하고, 새 URL을 자동 탐색해 재시도 후 localStorage에 조용히 저장. |
| **실시간 상태 체크** | Next.js 서버에서 벤더 상태 API를 호출해 CORS 우회. Atlassian Statuspage, Instatus, Hund.io 포맷 지원. |
| **앱별 컴포넌트 매칭** | 하나의 상태 페이지에 여러 제품이 올라온 경우(예: Adaptavist), 해당 앱의 컴포넌트만 정밀 매칭해 타 제품 장애로 인한 오탐을 방지. |
| **히트 히스토리** | 최근 30회 핑을 색상 바로 표시. 앱별 가동률(%) 계산. |
| **결과 캐싱** | 마지막 체크 결과를 localStorage에 저장해 remount 시 즉시 표시. 마지막 체크로부터 90초 이내라면 초기 스캔 생략으로 불필요한 API 호출 방지. |
| **자동 갱신** | 5분마다 자동으로 상태 체크 실행. |
| **상태 변경 알림** | 앱이 정상 / 성능 저하 / 장애 간 전환될 때 즉시 토스트 알림. |
| **다국어 지원** | 5개 언어 지원: English, 日本語, Deutsch, 한국어, Français. 로케일은 localStorage에 저장. 개인정보처리방침 페이지는 로케일에 따라 관할권별 법적 섹션(GDPR, 개인정보 보호법, APPI) 자동 표시. |
| **내보내기** | 앱 목록을 JSON 파일로 다운로드. |
| **다크 모드** | localStorage 저장 방식의 테마 토글. 플래시 방지 인라인 스크립트 포함. |
| **데이터베이스 불필요** | 모든 사용자 상태는 `localStorage`에 저장. 서버 사이드 API 라우트를 위해 Vercel 같은 Next.js 호스트가 필요하지만, 별도의 DB나 인증 인프라는 불필요. |

---

## 기술 스택

- **[Next.js 16](https://nextjs.org/)** (App Router, Turbopack) — 서버 사이드 상태 체크로 CORS 우회, 클라이언트 전용 상태로 무DB 아키텍처
- **[React 19](https://react.dev/)** — `memo`, `useCallback`, 동시성 기능
- **[TypeScript 5](https://www.typescriptlang.org/)** — 전체 strict 모드
- **[Tailwind CSS v4](https://tailwindcss.com/)** — 다크 모드 지원 유틸리티 퍼스트 스타일링
- **[base-ui](https://base-ui.com/)** — 헤드리스 프리미티브 (Tooltip, Dialog, Popover)
- **[shadcn/ui](https://ui.shadcn.com/)** — 컴포넌트 셸 (Table, Badge, Button)
- **[Lucide React](https://lucide.dev/)** — 아이콘 세트
- **[cmdk](https://cmdk.paco.me/)** — 앱 검색용 커맨드 팔레트
- **[Vercel Analytics](https://vercel.com/analytics)** + **[Speed Insights](https://vercel.com/docs/speed-insights)** — 프라이버시 중심 사용자 모니터링 및 Core Web Vitals 측정

---

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx                  # 루트 레이아웃 — SEO 메타데이터, 다크 모드 플래시 방지
│   ├── page.tsx                    # 메인 페이지 진입점
│   ├── privacy/page.tsx            # 개인정보처리방침 (로케일별 관할권 섹션)
│   ├── terms/page.tsx              # 이용약관
│   └── api/
│       ├── status/
│       │   └── route.ts            # POST — 상태 체크 엔진 (파서, 자가 복구)
│       └── marketplace/
│           ├── search/
│           │   └── route.ts        # GET — Marketplace 검색 프록시 + 자동 탐색 (Edge Runtime)
│           └── popular/
│               └── route.ts        # GET — 큐레이션 인기 앱 목록 (1시간 캐시)
├── components/
│   ├── status-dashboard.tsx        # 메인 대시보드 — 상태, 테이블, 알림, 공유, 다이얼로그
│   ├── add-app-dialog.tsx          # 검색 기반 앱 추가 플로우
│   ├── quick-setup-dialog.tsx      # 카테고리별 체크박스로 일괄 추가
│   ├── share-import-dialog.tsx     # 공유 링크로 받은 앱 미리보기 및 가져오기
│   ├── onboarding-dialog.tsx       # 첫 방문 가이드
│   ├── app-logo.tsx                # 로고 (없으면 첫 글자 이니셜로 폴백)
│   ├── language-switcher.tsx       # 언어 선택
│   ├── theme-toggle.tsx            # 다크/라이트 토글
│   └── ui/                         # shadcn/base-ui 컴포넌트 셸
├── lib/
│   ├── share.ts                    # 공유 링크 Base64URL 인코딩/디코딩
│   ├── status-discovery.ts         # 자동 탐색 프로브 엔진 + 벤더명 정규화
│   ├── url-guard.ts                # 아웃바운드 URL SSRF 방어
│   ├── utils.ts                    # cn() Tailwind 클래스 병합
│   └── i18n/
│       ├── locales.ts              # 로케일 목록 및 레이블
│       ├── translations.ts         # 5개 로케일 전체 번역 문자열
│       └── use-translation.tsx     # useTranslation 훅 + LocaleProvider
└── types/
    └── index.ts                    # 공유 타입 + PRODUCT_RULES + VENDOR_STATUS_MAP
```

---

## 상태 URL 해석 방식

상태 URL 해석은 우선순위 순으로 평가되는 4단계 파이프라인입니다.

### 1단계 — PRODUCT_RULES (최우선)

`src/types/index.ts`에 앱 이름 키워드로 매칭하는 규칙이 정의되어 있습니다. 상위 벤더와 별도의 상태 페이지를 운영하는 제품에 사용합니다.

```ts
{ keywords: ["zephyr enterprise"],  url: "https://zephyr-enterprise.status.smartbear.com/api/v2/status.json" },
{ keywords: ["scriptrunner"],       url: "https://status.connect.adaptavist.com/api/v2/summary.json" },
{ keywords: ["draw.io"],            url: "https://status.draw.io/index.json" },
```

선택적 `vendor` 가드를 추가하면 같은 키워드가 관련 없는 벤더 앱에 매칭되는 것을 방지합니다:

```ts
// 벤더명에 "tempo"가 포함될 때만 매칭
{ keywords: ["structure", "jira"], vendor: "tempo", url: "https://status.tempo.io/api/v2/status.json" },
```

### 2단계 — VENDOR_STATUS_MAP (폴백)

일치하는 규칙이 없으면 벤더명을 정적 맵에서 조회합니다. `startsWith` + 단어 경계 체크를 사용해 부분 이름 충돌을 방지합니다.

모든 Marketplace 벤더명은 조회 전에 `normalizeVendorName()`을 거쳐 M&A 이력을 정규화합니다:

| 원본 이름 | 정규화 결과 |
|---|---|
| SoftwarePlant | appfire |
| Bob Swift | appfire |
| ALM Works | tempo software |
| Old Street Solutions | tempo software |
| OnResolve | adaptavist |
| iDalko / iGo Software | exalate |
| Axosoft | gitkraken |
| Xpand IT | xblend |

### 3단계 — 자동 탐색 (미등록 벤더)

정적 맵에 항목이 없으면 `discoverStatusUrl()`이 일반적인 URL 패턴을 병렬로 탐색합니다:

```
status.{slug}.com/api/v2/status.json
status.{slug}.com/summary.json
{slug}.statuspage.io/api/v2/status.json
...
```

각 탐색 결과는 두 가지 검증을 통과해야 채택됩니다:

1. **포맷 검증** — JSON에 `status.indicator`(Statuspage), `page.status`(Instatus), `data`+`included`(Hund.io) 중 하나가 있어야 함
2. **페이지명 검증** — 상태 페이지의 `page.name`이 벤더명의 주요 토큰 다수를 포함해야 함. 다른 회사의 `status.catapult.com`에 "Catapult Labs"가 매칭되는 걸 방지.

5자 미만이거나 일반적인 영단어(`open`, `smart`, `flow`, `work` 등 50개 이상)로 이루어진 슬러그는 탐색 대상에서 제외됩니다.

### 4단계 — 자가 복구 (런타임 URL 복구)

상태 체크에서 DNS/연결 오류(`ENOTFOUND`, `ECONNREFUSED` 등)가 발생하면 저장된 URL이 오래된 것으로 판단합니다:

1. `discoverStatusUrl()`로 새 URL 탐색 (2초 프로브 예산)
2. 새 URL로 상태 체크 재시도
3. 응답에 `updatedStatusUrl` 포함

대시보드의 `applyResults()`가 이 필드를 감지해 localStorage의 URL을 자동 갱신합니다. 이후 모든 체크는 올바른 주소를 사용합니다.

---

## 오탐 방지 레이어

| 레이어 | 위치 | 방지 내용 |
|---|---|---|
| `isStatuspageLike()` | `status-discovery.ts` | 임의의 JSON 엔드포인트가 상태 페이지로 수락되는 것 |
| `vendorPageNameMatch()` | `status-discovery.ts` | 다른 회사의 상태 페이지에 바인딩되는 것 |
| `SLUG_BLOCKLIST` (50개+) | `status-discovery.ts` | 일반 영단어가 서브도메인으로 탐색되는 것 |
| `startsWith` + 단어 경계 | `types/index.ts` | VENDOR_STATUS_MAP 부분 이름 충돌 |
| `vendor?` 가드 | `types/index.ts` | 무관한 벤더 앱에 일반 키워드 규칙이 매칭되는 것 |
| `VENDOR_BLACKLIST` | `types/index.ts` | 공개 상태 페이지가 없는 벤더가 자동 탐색되는 것 |
| `enrichWithDiscovery` 블랙리스트 체크 | `marketplace/search/route.ts` | 블랙리스트 벤더가 빈 statusUrl 필터를 통해 탐색에 재진입하는 것 |

---

## 상태 체크 엔진

`POST /api/status`는 `RegisteredApp` 배열을 받아 각각의 상태를 반환합니다. 응답 포맷을 자동 감지합니다.

### 지원 포맷

| 포맷 | 감지 기준 | 예시 벤더 |
|---|---|---|
| **Atlassian Statuspage** `summary.json` | `payload.status.indicator` 필드 존재 | SmartBear, Adaptavist, Tempo, Gliffy |
| **Instatus** `summary.json` | `payload.page.status` 필드 존재 | OBoard, Exalate |
| **Hund.io / JSON:API** `index.json` | `payload.data` + `payload.included` 존재 | draw.io |
| **HTTP ping** | `checkType === "http_ping"` | 임의의 URL |

### 상태 매핑

| 원본 상태 | 표시 상태 |
|---|---|
| `operational`, `none` indicator, `UP` | ✅ 정상 |
| `degraded_performance`, `partial_outage`, `minor` indicator, `UNDERMAINTENANCE` | ⚠️ 성능 저하 |
| `major_outage`, `critical`, `MAJOROUTAGE` | 🔴 장애 |

`partial_outage`는 **성능 저하**로 표시됩니다(장애 아님) — 일부 노드만 영향을 받는 상황이므로 전체 서비스 중단과 구분합니다.

### 통합 페이지에서 앱별 컴포넌트 매칭

많은 벤더가 여러 제품을 하나의 상태 페이지에서 운영합니다(예: Adaptavist는 ScriptRunner, Bitbucket Connector 등을 모두 `status.connect.adaptavist.com`에서 관리). 해당 페이지 전체가 "부분 장애"여도 실제로는 관심 없는 다른 컴포넌트의 문제일 수 있습니다.

상태 체크 엔진은 컴포넌트 목록에 대해 2패스 매칭을 실행합니다:

1. **퍼지 이름 매칭** — "for Jira/Confluence" 접미사를 제거하고 구두점을 정규화한 뒤 양방향 부분 문자열 포함 여부를 확인합니다.
2. **토큰 점수 매칭** — 앱 이름을 토큰화(불용어 및 "jira" 같은 플랫폼 단어 제외)하고, 각 컴포넌트에 키워드·플랫폼 중복 점수를 매깁니다. 리프 컴포넌트는 부모 그룹 이름을 상속해 점수를 계산합니다 — 예를 들어 "Jira Cloud" 그룹 내 "Synchronisation node"는 "Jira Cloud Synchronisation node"로 점수를 계산해 Jira 앱에 플랫폼 보너스를 받습니다.

플랫폼 단어(`jira`, `confluence`)는 메인 토큰 집합에서 분리해 별도로 점수를 계산합니다. 플랫폼 단어만 앱 이름과 겹치는 컴포넌트는 0점으로 처리 — "`* for Jira`"인 앱이 통합 페이지의 모든 Jira 컴포넌트에 매칭되는 것을 방지합니다.

0점 초과인 컴포넌트만 선택됩니다. 매칭되는 컴포넌트가 없으면 페이지 전체 상태를 사용합니다.

---

## 공유 링크

앱 목록을 URL 해시에 인코딩합니다 — 서버 저장 없음.

```
https://marketplace.yeachan.cloud/#share=eyJpIjoiY29tLm9ucmVzb2x2ZS5...
```

**인코딩:** 각 앱을 5개 필드(`i`/`n`/`v`/`u`/`t` + 선택적 `l`)로 최소화 → JSON 직렬화 → UTF-8 인코딩 → Base64URL(URL 안전, 패딩 없음). 해시 프래그먼트는 서버로 전송되지 않습니다.

**가져오기:** `#share=` 해시가 감지되면 앱 목록 미리보기 다이얼로그가 표시됩니다. 이미 대시보드에 있는 앱(ID 또는 앱명 기준)은 중복 추가에서 제외됩니다. 가져온 앱은 즉시 상태 체크를 실행합니다.

---

## 데이터 모델

모든 상태는 `localStorage`에 저장됩니다 — 데이터베이스나 인증 불필요.

```ts
// "jira-marketplace-apps"
RegisteredApp {
  id: string           // Marketplace 애드온 키 (예: "com.mxgraph.jira.drawio")
  appName: string
  vendorName: string
  checkType: CheckType // "statuspage_api" | "http_ping" | "custom"
  statusUrl: string    // 해석된 API 엔드포인트
  logoUrl?: string     // Marketplace CDN URL
}

// "jira-marketplace-history"
Record<appId, PingRecord[]>  // 앱당 최근 30회 핑 기록

// "jira-marketplace-latest"
Record<appId, HealthCheckResult>  // 앱당 마지막 체크 결과 (remount 시 즉시 표시)

// "jira-marketplace-last-checked"
string  // 마지막 전체 스캔 ISO 8601 타임스탬프 (90초 쿨다운 판단용)

PingRecord {
  status: "operational" | "degraded" | "outage"
  timestamp: string     // ISO 8601
  responseTimeMs: number | null
  message?: string
}
```

마운트 시마다 저장된 앱을 최신 `PRODUCT_RULES`와 `VENDOR_STATUS_MAP`으로 마이그레이션해 오래된 상태 URL을 자동으로 수정합니다.

---

## API 라우트

### `POST /api/status`

앱 배열을 받아 각각의 상태를 반환합니다.

**요청:**
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

**응답:**
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

자가 복구가 작동할 경우 결과에 추가로 포함:
```json
{
  "updatedStatusUrl": "https://new.vendor-status.com/api/v2/summary.json",
  "updatedCheckType": "statuspage_api"
}
```

클라이언트가 자동으로 새 URL을 localStorage에 저장합니다.

**요청 제한:** IP당 60초 창 내 600개 앱 (인메모리, 서버리스 인스턴스 단위 초기화).

### `GET /api/marketplace/search?query={text}&limit={n}`

Atlassian Marketplace REST API v2 프록시. **Edge Runtime**으로 실행해 콜드 스타트 지연이 거의 없습니다. 정적 맵에 없는 벤더는 자동 탐색으로 보완 (쿼리당 최대 12개 벤더, 800ms 예산). 블랙리스트 벤더는 탐색에서 제외됩니다.

결과는 60초 인메모리 캐시(`query:limit` 키 기준).

### `GET /api/marketplace/popular`

카테고리별 큐레이션 인기 앱 목록. 1시간 인메모리 캐시.

**카테고리:** Automation · Time Tracking · Testing & QA · Diagrams · Reporting · Planning · Dev Tools · Integrations · Utilities

---

## 지원 벤더

정적 맵에 등록된 벤더는 자동 탐색 없이 항상 즉시 해석됩니다:

| 벤더 | 상태 페이지 |
|---|---|
| Atlassian | status.atlassian.com |
| Appfire (+ SoftwarePlant, Bob Swift, Comalatech 등) | appfire-apps.statuspage.io |
| Tempo Software (+ ALM Works, Old Street, Roadmunk 등) | status.tempo.io |
| Adaptavist (+ OnResolve, Brikit, Meetical) | status.connect.adaptavist.com |
| SmartBear (Zephyr 제품군, BitBar, Cucumber) | 제품별 서브도메인 |
| GitKraken (+ Axosoft) | gij.gitkrakenstatus.com |
| Exalate (+ iDalko, iGo Software) | status.exalate.com |
| JGraph (draw.io) | status.draw.io |
| Gliffy | status.gliffy.com |
| Balsamiq | status.balsamiq.com |
| Lucid | status.lucid.co |
| Miro | status.miro.com |
| EazyBI | status.eazybi.com |
| OBoard | oboard.instatus.com |
| Xblend / Xpand IT (Xray, Xporter) | 제품별 |
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

공개 상태 페이지 없음으로 확인된 벤더 (`VENDOR_BLACKLIST`): `k15t`, `midori`, `reliex`, `ease solutions`, `open source consulting`, `decadis`, `meta-inf`.

---

## 시작하기

### 요구사항

- Node.js 18+
- npm 9+

### 설치

```bash
git clone https://github.com/happy-yeachan/Marketplace-App-Status.git
cd Marketplace-App-Status
npm install
```

### 개발 서버

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속.

### 프로덕션 빌드

```bash
npm run build
npm start
```

### 배포

서버 사이드 API 라우트를 위해 Next.js 호환 호스트가 필요합니다. **Vercel**이 권장 플랫폼으로, 저장소 연결만으로 배포됩니다.

GitHub Pages, Cloudflare Pages(Workers 없는 순수 정적) 등은 `/api/status`, `/api/marketplace/*` 라우트 핸들러 때문에 **지원되지 않습니다.**

**환경 변수 (선택):**

| 변수 | 기본값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://marketplace-app-status.vercel.app` | 캐노니컬 URL, OG 태그, 사이트맵에 사용 |

---

## 확장 방법

### 새 벤더 추가

`src/types/index.ts`의 `VENDOR_STATUS_MAP`에 추가:

```ts
"yourvendor": "https://status.yourvendor.com/api/v2/summary.json",
```

키는 소문자. `status.json`보다 `summary.json` 사용 권장 — 앱별 컴포넌트 매칭에 컴포넌트 목록이 필요하기 때문입니다.

벤더명이 Marketplace와 다를 경우 `src/lib/status-discovery.ts`의 `normalizeVendorName()`에 정규화 규칙 추가:

```ts
if (l.includes("구사명")) return "yourvendor";
```

### 제품별 규칙 추가

상위 벤더와 별도의 상태 페이지를 가진 제품에 사용. `src/types/index.ts`의 `PRODUCT_RULES`에 벤더 항목보다 **앞에** 추가:

```ts
{ keywords: ["product name"], url: "https://status.yourproduct.com/api/v2/summary.json" },
```

키워드가 일반 영단어라면 `vendor` 가드 추가:

```ts
{ keywords: ["product", "jira"], vendor: "yourvendor", url: "https://..." },
```

### 상태 페이지 없는 벤더 등록

`src/types/index.ts`의 `VENDOR_BLACKLIST`에 추가해 자동 탐색 차단:

```ts
export const VENDOR_BLACKLIST = new Set([
  "yourvendor",
]);
```

### 빠른 설정 목록에 앱 추가

`src/app/api/marketplace/popular/route.ts`의 `CURATED` 배열에 추가:

```ts
{ query: "Your App Name for Jira", vendorHint: "vendorname", category: "Utilities" },
```

- `query` — Marketplace 검색 API에 그대로 전달
- `vendorHint` — 동명 앱이 여러 개일 때 올바른 결과를 고르기 위한 벤더명 부분 문자열
- `category` — `Automation` · `Time Tracking` · `Testing & QA` · `Diagrams` · `Reporting` · `Planning` · `Dev Tools` · `Integrations` · `Utilities` 중 하나

### 새 언어 추가

1. `src/lib/i18n/locales.ts`에 로케일 코드 추가
2. `src/lib/i18n/translations.ts`에 번역 객체 추가
3. 관할권별 법적 요건이 있는 경우 `privacy.jurisdictionHeading` / `privacy.jurisdictionBody` 키 추가 + `src/app/privacy/page.tsx`의 `hasJurisdictionSection` 목록에 추가

---

## 아키텍처 결정

**데이터베이스가 없는 이유:** 대상 사용자는 개인 대시보드를 원하는 Jira 관리자 또는 개발자입니다. `localStorage`가 더 단순하고 빠르며 인프라가 필요 없습니다. 모든 데이터는 사용자 기기에 보관됩니다.

**Next.js 서버 프록시로 상태 체크를 하는 이유:** 벤더 상태 페이지는 브라우저의 직접 요청을 CORS로 차단합니다. Next.js 서버에서 fetch를 실행하면 이를 완전히 우회합니다. 또한 응답 포맷을 정규화해 클라이언트가 Statuspage와 Instatus의 차이를 처리할 필요가 없어집니다.

**정적 벤더 맵을 사용하는 이유:** 상태 페이지 URL은 거의 바뀌지 않습니다. 큐레이션된 맵은 결정론적이고 테스트된 결과를 제공합니다. 자동 탐색은 아직 맵에 없는 벤더의 롱테일을 커버합니다.

**`status.json` 대신 `summary.json`을 사용하는 이유:** Atlassian Statuspage의 `summary.json`은 전체 컴포넌트 목록을 포함해 통합 벤더 페이지에서 앱별 매칭이 가능합니다. `status.json`은 전체 지표만 반환합니다. 상태 체크 라우트는 레거시 `status.json` URL을 자동으로 업그레이드합니다.

**`#share=` 해시로 공유하는 이유:** 해시 프래그먼트는 서버로 전송되지 않아 앱 목록이 완전히 클라이언트 사이드에 머뭅니다. 파일 업로드, DB 쓰기, 만료 기간이 없습니다. URL이 길어지는 단점이 있지만, 10~30개 앱의 Base64URL 페이로드는 2 KB 이하입니다.

**Jira에서 직접 가져오지 않는 이유:** Jira의 UPM REST API는 전통적인 P2(서버/DC) 플러그인 시스템의 앱만 반환합니다. Forge 앱(현대적 클라우드 플랫폼) — ScriptRunner Cloud를 포함한 많은 최신 앱 — 은 UPM에서 보이지 않습니다. 클라우드 앱의 상당 부분을 조용히 누락하게 되므로, 공개 Marketplace API를 사용하는 빠른 설정과 검색으로 대체했습니다.

**단순 오류 보고 대신 자가 복구를 하는 이유:** 신뢰성은 이 대시보드의 핵심 가치입니다. 저장된 URL이 오래되어 DNS 실패가 발생했는데 단순히 "장애"로 표시한다면, 실제 장애 상황에서 더 쓸모없는 오탐이 됩니다. 자가 복구는 네트워크 레벨 실패(오래된 URL)와 HTTP 레벨 실패(실제 장애)를 구분해 자동으로 복구하므로, 상태 신호의 신뢰성을 유지합니다.

---

## 기여 및 피드백

잘못 등록된 벤더를 발견했거나 새 기능을 제안하고 싶으신가요?

- **[이슈 제보](https://github.com/happy-yeachan/Marketplace-App-Status/issues)** — 버그 신고, 벤더 매핑 수정, 기능 요청
- **Pull Request 환영** — 특히 `VENDOR_STATUS_MAP`이나 `PRODUCT_RULES`에 벤더 추가

이 프로젝트는 Atlassian과 무관합니다.

---

## 라이선스

MIT
