# Atlassian App Status — 개발 기록

> Jira · Confluence 서드파티 앱 실시간 상태 모니터링 대시보드
> 개발자: 오예찬 | 기준일: 2026-05-04

---

## 1. 배경 및 목적

Atlassian 자체 서비스는 공식 상태 페이지가 있지만, 팀이 실제로 사용하는 ScriptRunner, Tempo, Zephyr, draw.io 같은 서드파티 앱들은 각 벤더가 개별적으로 상태 페이지를 운영합니다. 장애 발생 시 URL을 하나하나 찾아다녀야 하는 문제가 있었습니다.

**해결책:** 모든 앱의 상태를 하나의 대시보드에서 실시간으로 확인할 수 있는 서비스 개발.

**핵심 조건**
- 로그인 불필요
- 데이터베이스 불필요 (모든 상태는 브라우저 localStorage)
- Atlassian 인스턴스에 접근하지 않음
- 서버는 CORS 우회용 프록시 역할만 수행

---

## 2. 기술 스택

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 16.2 (App Router) | API Route로 CORS 우회, 서버리스 배포 최적화 |
| UI | React 19 + TypeScript 5 | 타입 안전성, concurrent 기능 |
| 스타일 | Tailwind CSS v4 | 다크 모드 내장, 빠른 개발 |
| 컴포넌트 | shadcn/ui + base-ui | 헤드리스 접근성 프리미티브 |
| 배포 대상 | Vercel | API Route를 서버리스 함수로 자동 변환 |
| 데이터 저장 | localStorage only | DB 인프라 비용 0원, 사용자 데이터 완전 클라이언트 보관 |

---

## 3. 주요 기능 구현 요약

### 3-1. 상태 URL 자동 해석 (4단계 파이프라인)

벤더마다 상태 페이지 URL 패턴이 제각각이라 단순 매핑으로는 커버가 어려웠습니다. 4단계 우선순위 파이프라인으로 해결했습니다.

```
1. PRODUCT_RULES  — 앱 이름 키워드 매칭 (최우선)
   예) "zephyr enterprise" → zephyr-enterprise.status.smartbear.com

2. VENDOR_STATUS_MAP  — 벤더명 정적 맵 조회
   예) "tempo software" → status.tempo.io

3. 자동 탐색(Auto-discovery)  — 미등록 벤더 자동 프로브
   status.{slug}.com, {slug}.statuspage.io 등 병렬 탐색

4. 자가 복구(Self-healing)  — 런타임 DNS 실패 감지 시 새 URL 자동 탐색 후 저장
```

**M&A 이력 정규화 예시**

| Marketplace 벤더명 | 실제 처리 |
|---|---|
| SoftwarePlant | → appfire |
| ALM Works | → tempo software |
| OnResolve | → adaptavist |
| iDalko / iGo Software | → exalate |

### 3-2. 앱별 컴포넌트 매칭

Adaptavist처럼 하나의 상태 페이지에 수십 개 제품을 올리는 벤더가 있습니다. 페이지 전체 상태가 "부분 장애"여도 내가 쓰는 ScriptRunner는 정상일 수 있습니다.

→ 상태 응답의 `components[]`를 순회하며 앱 이름과 퍼지 매칭해 해당 컴포넌트의 상태만 추출합니다. 매칭 실패 시에만 페이지 전체 상태를 사용합니다.

### 3-3. 링크 공유 기능

앱 목록을 URL 하나로 공유할 수 있습니다.

- 앱 목록을 최소화된 JSON으로 직렬화 → Base64URL 인코딩 → `#share=...` 해시에 삽입
- 해시 프래그먼트는 서버로 전송되지 않으므로 별도 저장소 불필요
- 수신자가 링크 접속 시 가져오기 다이얼로그 자동 표시
- Marketplace 앱 ID를 페이로드에 보존해 빠른 설정 다이얼로그의 "이미 추가됨" 감지 호환

### 3-4. 다국어 지원 (i18n)

5개 언어 지원: **English, 日本語, Deutsch, 한국어, Français**

- 직접 구현한 경량 i18n 시스템 (`useTranslation` 훅 + `LocaleProvider`)
- 로케일은 localStorage 저장
- 개인정보처리방침 페이지는 로케일에 따라 관할권별 법적 섹션 자동 표시
  - de / fr → GDPR 안내
  - ko → 개인정보 보호법(PIPA) 안내
  - ja → APPI 안내

### 3-5. 결과 캐싱 및 중복 스캔 방지

- 마지막 체크 결과를 localStorage에 저장 → 페이지 재방문 시 즉시 표시
- 마지막 체크로부터 90초 이내 재방문이면 초기 스캔 생략
- 자동 갱신은 5분마다 유지

---

## 4. 핵심 아키텍처 결정

### 왜 데이터베이스를 쓰지 않았나?

대상 사용자는 개인 대시보드가 필요한 Jira 관리자/개발자입니다. 모든 설정을 localStorage에 저장하면:
- 서버 인프라 비용 0원
- 사용자 데이터가 본인 기기에만 존재 (개인정보 이슈 없음)
- 오프라인에서도 캐시된 결과 즉시 표시

### 왜 Next.js 서버 프록시가 필요한가?

벤더 상태 페이지들은 브라우저의 직접 요청을 CORS로 차단합니다. Next.js API Route를 프록시로 사용하면 서버에서 fetch를 실행해 CORS를 완전히 우회합니다.  
→ 순수 정적 배포(GitHub Pages 등)는 이 때문에 **불가**합니다. **Vercel 필수**.

### 왜 `#share=` 해시로 공유하나?

해시 프래그먼트는 브라우저가 서버로 전송하지 않습니다. 별도 스토리지 없이 앱 목록을 URL에 담을 수 있고, 공유된 데이터가 서버에 남지 않습니다.

### Jira UPM API를 쓰지 않은 이유

Jira의 UPM REST API는 전통적인 P2 플러그인만 반환합니다. ScriptRunner Cloud 등 Forge 기반 앱은 UPM에 노출되지 않아 설치된 앱의 상당 수가 누락됩니다. 공개 Marketplace API를 사용하는 검색 + 빠른 설정으로 대체했습니다.

---

## 5. 지원 벤더 현황

정적 맵에 등록된 주요 벤더 (총 30+개):

Atlassian, Appfire, Tempo Software, Adaptavist, SmartBear (Zephyr 제품군), GitKraken, Exalate, JGraph (draw.io), Gliffy, Balsamiq, Lucid, Miro, EazyBI, OBoard, Xblend/Xpand IT, Tricentis, Resolution, HeroCoders, Move Work Forward, Elements, Deviniti, Refined, Deiser, Easy Agile, Aha!, ProjectBalm, DevSamurai, Twinit, SolDevelo, Bloompeak, Codefortynine, SaaSJet, TeamLead, MindPro, Cypress.io

---

## 6. 알려진 제약사항

| 항목 | 내용 |
|---|---|
| 단일 사용자 | 기기 간 동기화 없음. 공유 링크로 팀원끼리 설정 공유는 가능. |
| 서버리스 Rate Limit | IP당 60초 내 600개 앱. 멀티 인스턴스 배포 시 인메모리 제한으로 공유 안 됨. |
| 자동 탐색 신뢰도 | 페이지명 검증 등 오탐 방지 레이어가 있으나, 미등록 벤더의 URL은 잘못 감지될 가능성 있음. 틀리면 직접 URL 입력 가능. |
| 순수 정적 배포 불가 | API Route 필요로 Vercel(또는 동급 서버리스 플랫폼) 필수. |

---

## 7. 배포 방법

```bash
# 저장소 클론
git clone https://github.com/happy-yeachan/SaaS-Jira-Apps-Status.git

# 의존성 설치
npm install

# 로컬 개발 서버
npm run dev        # http://localhost:3000

# 프로덕션 빌드
npm run build && npm start
```

**Vercel 배포:** 저장소 연결만으로 자동 배포됩니다. 환경변수 설정 불필요.

---

## 8. 저장소

**GitHub:** https://github.com/happy-yeachan/SaaS-Jira-Apps-Status

---

*작성: 오예찬 | 문의 사항은 Slack 또는 GitHub Issues로*
