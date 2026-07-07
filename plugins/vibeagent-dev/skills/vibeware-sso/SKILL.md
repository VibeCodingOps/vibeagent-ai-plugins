---
name: vibeware-sso
description: VibeWare 포탈(회사 계정·웹포탈) SSO 로그인 연동 전용 — auth/sso 재서명·tenant_id 검증·role 분기. "VibeWare 로그인", "포탈 SSO 붙여줘", "회사 계정 로그인"처럼 VibeWare/웹포탈 SSO를 명시할 때만 사용. 일반 로그인·Supabase Auth·소셜 로그인엔 금지.
disable-model-invocation: true
---

<!--
  SYNC: 이 파일은 내장 스킬 사본과 쌍둥이다 → (VibeAgent repo) skills/vibeware-sso/SKILL.md
  코어 규칙·코드·references 는 두 사본을 동일하게 유지. body 는 env 배선/참조 로딩만 다름.
  포탈 화면 라벨의 정본 출처 = VibeWare app/admin/page.tsx TABS (가이드 문서 라벨은 stale 가능).
-->

# VibeWare 포탈 SSO 연동 (회사 계정 로그인) — 로컬 개발

로컬에서 이어 개발하는 앱에 **회사 계정(VibeWare 포탈) 로그인**을 붙인다. 프로토콜은 HTTP 리디렉트 + HS256 JWT 쿠키뿐: 포탈이 60초 JWT 발급 → 이 서비스가 자체 세션 JWT로 **재서명**해 쿠키 저장.

## 규칙 -1 — 스코프 가드 (먼저 판정, 무조건 시작 금지)

이 스킬은 **VibeWare/웹포탈/포탈 SSO(회사 계정 로그인) 연동 전용**이다. 사용자 요청이 명시적으로 그게 아니면 — 예: 일반 이메일·비밀번호 로그인, Supabase Auth, Google·Kakao 등 소셜 로그인 — **이 스킬을 쓰지 말고 즉시 빠져나와** 한 줄 안내 후 종료한다.
> 예: "이건 VibeWare 포탈(회사 계정) SSO 연동 전용이에요. 일반 로그인이 필요하시면 그 방식으로 만들어 드릴게요."

## 규칙 0 — 선행조건 (코드 쓰기 전 필수)

VibeWare 포탈 등록/키 발급은 **AI가 대신 못 한다**(포탈 브라우저 로그인 + 별도 관리자 승인). 그리고 **로컬은 secretless라 `SSO_SECRET`을 서버에서 자동으로 못 받는다** — 사용자가 포탈에서 발급받아 직접 줘야 한다.

1. **먼저 DEV_BYPASS mock으로 돌린다.** 실제 키가 없어도 `DEV_BYPASS_SSO=true`로 로그인·역할 등급이 도는 화면을 즉시 보여줄 수 있다. 코드는 이걸 전제로 먼저 작성해도 안전(런타임 throw 없음).
2. **실제 SSO는 키가 있어야 한다.** 사용자가 아직 키가 없으면 아래 **"SSO 키 발급"** 워크스루로 안내. 키가 준비되면 아래 **env 배선**의 배포/로컬 경로로 넣는다.
3. `SSO_SECRET` 값을 채팅으로 보여주거나 되묻지 마라. 사용자에게 값만 받아 파일/원격에 넣고, 이후엔 키 이름만 확인한다(값 미출력).

## 동작 개요 + 만들 파일

```
[사용자] → 포탈 대시보드에서 서비스 카드 클릭
  → 포탈이 60초 JWT 발급 → 서비스의 /auth/sso?token=... 로 리디렉트
    → /auth/sso: 토큰 검증 → 자체 세션 JWT 재서명 → 쿠키 저장 → / 로 이동
```

| 파일 | 역할 |
|---|---|
| `app/auth/sso/route.ts` | SSO 진입점 — 포탈 JWT 검증·재서명·쿠키 발급 |
| `app/page.tsx` (보호 페이지) | 세션 검증 + **역할 기반 기능 등급** |
| `app/login/page.tsx` | **공개** "포탈 대시보드로 접속" 안내 페이지 (비로그인 랜딩) |
| `app/auth/logout/route.ts` | 세션 쿠키 삭제 후 `/login` |

로컬 AI는 이 파일들을 **로컬 파일시스템에 직접 작성**한다.

## SSO 키 발급 (사용자가 포탈에서 — AI 대행 불가)

포탈은 first-party 로그인 + 관리자 승인이라 AI/브리지가 대행할 수 없다. 사용자를 이 4단계로 안내(딥링크 `{PORTAL_URL}/dashboard/dev`):

1. 포탈 개발자 대시보드 `{PORTAL_URL}/dashboard/dev` → **내 서비스** 카드 → 서비스 등록(이름·URL·포트) + **"SSO 연동" 체크박스 ON**.
2. 그 서비스의 SSO 키 영역에서 (Bearer API 쓸 때만) 필요한 스코프를 선택한 뒤 **"SSO 발급 신청"** → 상태가 "관리자 승인 대기 중"으로 바뀜.
3. **관리자**(다른 사람)가 `{PORTAL_URL}/admin` → **"SSO 발급 승인"** 탭에서 승인 → 상태 "승인됨 — 확인 대기".
4. 사용자가 그 화면에서 **"확인하기"**(모달 "SSO 서명 키 확인")로 평문 키 복사. 이후 **"다시 확인"으로 재조회 가능(최대 5회, 매번 감사 로그 기록)** — 복사를 놓쳐도 되고, 초과 시 **"재발급 신청"**으로 관리자 재승인.

**승인 대기가 "막힘"이 되지 않게** — 3에서 승인을 기다리는 동안에도 DEV_BYPASS mock으로 앱이 도는 걸 보여주고, 4에서 실제 키가 오면 그 값만 꽂아 전환한다.

## env 배선 (로컬은 secretless)

로컬은 `SSO_SECRET`을 자동으로 못 받는다(`get_public_env`는 anon key·URL만). 사용자가 4단계에서 복사한 키를 받아 넣는다 — **두 경로**:

- **배포 SSO** (실제 서비스에서 동작): MCP `set_vercel_env`로 올린다.
  - `set_vercel_env` `SSO_SECRET` = <사용자가 준 값> / `PORTAL_URL` = <포탈 주소> / (선택) `ALLOWED_TENANT_IDS`.
  - 그 다음 `request_vercel_deploy`로 재배포해야 반영된다. 값은 서버→Vercel 런타임 전용이라 로컬 `.env`엔 안 들어간다. **채팅에 값 재출력 금지.**
- **로컬 SSO** (로컬에서 실제 포탈 왕복 테스트): 사용자가 준 키 값을 받아 **AI가 `.env.development.local`에 `SSO_SECRET`을 직접 추가**한다(사용자는 값만 제공, 편집기 직접 열 필요 없음). `PORTAL_URL`·(선택)`ALLOWED_TENANT_IDS`도 같이. **값은 채팅에 다시 출력하지 말고**(secret-safety), 이후엔 키 존재만 확인.
- **로컬 mock** (키 없이 즉시 확인): `.env.development.local`에 `DEV_BYPASS_SSO=true` (+ 선택 `DEV_BYPASS_SCENARIO`). 실제 키 없이 로그인·등급 왕복.

> `set_vercel_env`는 Vercel 런타임에만 반영되고 로컬 `.env`엔 안 들어간다 — 배포와 로컬은 독립. 자세한 secret 취급은 `vibeagent-secret-safety`, 인프라 도구는 `vibeagent-infra-ops` 스킬 참조.

## 코어 코드

`SERVICE_ID` / `COOKIE_NAME`은 서비스별 고유 값으로 치환한다(예: `scheduler`, `scheduler_sso`).

### 세션 타입 (`SSOPayload`)

세션 사용자 정보 타입. **별도 파일이 아니라 아래 `app/page.tsx` 상단에 함께 정의**한다(유일 소비자 — route.ts는 jose `payload`를 직접 쓰므로 이 타입 불필요). 필드: `sub`(이메일)·`name`·`service`·`role`(`viewer`|`editor`|`owner`, 2026-05부 `admin` 폐기)·`tenant_id`·`tenant_name`(표시 전용)·`service_owner_tenant_id`·`is_owner_tenant`·`borrowing_active`·`via`(감사 전용)·`scopes`. 전체 정의는 page.tsx 코드 블록 참조.

### `app/auth/sso/route.ts` — 진입점 (규칙 1·2·3)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const PORTAL_URL = process.env.PORTAL_URL ?? 'http://localhost:13000'
const SERVICE_ID = 'my-service'      // ← 서비스 식별자 (에러 리다이렉트 표기용)
const COOKIE_NAME = 'my_service_sso' // ← 서비스별 고유
const SESSION_TTL = 3600             // native 세션(초) — 1시간 이내 권장
const BORROWING_TTL = 600            // borrowing 세션(초) — 잔존 윈도우 단축
// 표준 JWT claim 만 drop. 나머지(tenant_id·scopes·is_owner_tenant…)는 spread 로 승계.
const STANDARD_JWT_CLAIMS = ['iat', 'exp', 'nbf', 'iss', 'aud', 'jti']

function getSecret() {
  const s = process.env.SSO_SECRET
  if (!s) throw new Error('SSO_SECRET 미설정')
  return new TextEncoder().encode(s)
}

// (선택) 특정 회사만 허용. 비우면 null → 포탈 service_grants 에 위임(자동 허용). 절대 throw 금지.
function getAllowedTenantIds(): Set<string> | null {
  const raw = process.env.ALLOWED_TENANT_IDS
  if (!raw) return null
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return ids.length ? new Set(ids) : null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s)
}

// 화이트리스트 외(legacy 'admin'·임의값)는 fail-closed 로 viewer 강등 — 절대 승격 금지.
const ROLE_WHITELIST = ['viewer', 'editor', 'owner'] as const
function normalizeRole(raw: unknown): 'viewer' | 'editor' | 'owner' {
  return typeof raw === 'string' && (ROLE_WHITELIST as readonly string[]).includes(raw)
    ? (raw as 'viewer' | 'editor' | 'owner')
    : 'viewer'
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  // 토큰 없이 진입 = 포탈 미경유 직접 접근 → 자체 안내 페이지로 (포탈로 튕기지 않음)
  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  try {
    // 규칙 1: 포탈 JWT 검증 (60초, HS256 고정 — 가이드 §2 MUST)
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    // 포탈 토큰엔 항상 sub(이메일)이 있어야 함 — 누락은 변조/구버전 포탈
    if (typeof payload.sub !== 'string' || !payload.sub) {
      return NextResponse.redirect(`${PORTAL_URL}/dashboard?error=sso_failed&service=${SERVICE_ID}`)
    }

    // 규칙 2: 유효한 tenant_id(UUID) 필수 + (선택) 회사 화이트리스트
    const tenantId = payload.tenant_id
    if (!isUuid(tenantId)) {
      return NextResponse.redirect(`${PORTAL_URL}/dashboard?error=sso_failed&service=${SERVICE_ID}`)
    }
    const allowed = getAllowedTenantIds()
    if (allowed && !allowed.has(tenantId)) {
      return NextResponse.redirect(`${PORTAL_URL}/dashboard?error=sso_failed&service=${SERVICE_ID}`)
    }

    // 규칙 3: borrowing 가드 + TTL 분기
    if (payload.via === 'grant' && payload.borrowing_active !== true) {
      return NextResponse.redirect(`${PORTAL_URL}/dashboard?error=sso_failed&service=${SERVICE_ID}`)
    }
    const effectiveTtl = payload.borrowing_active === true ? BORROWING_TTL : SESSION_TTL

    // 규칙 1: spread 재서명 — 표준 claim 만 제거, 나머지 승계, 신뢰 claim 은 뒤에서 재명시(변조 방어)
    const userClaims = Object.fromEntries(
      Object.entries(payload).filter(([k]) => !STANDARD_JWT_CLAIMS.includes(k)),
    )
    const sessionToken = await new SignJWT({
      ...userClaims,
      sub: payload.sub,
      name: payload.name,
      service: payload.service,
      role: normalizeRole(payload.role), // 화이트리스트 외 값은 viewer 강등(fail-closed)
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${effectiveTtl}s`)
      .sign(getSecret())

    const res = NextResponse.redirect(new URL('/', req.url))
    res.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: effectiveTtl,
    })
    return res
  } catch {
    // 실제 검증 실패 = 설정 문제 → 포탈로 신호(관리자 로깅·트러블슈팅)
    return NextResponse.redirect(`${PORTAL_URL}/dashboard?error=sso_failed&service=${SERVICE_ID}`)
  }
}
```
> 🚫 인증 판단에 `Referer`/`Origin` 헤더를 쓰지 마라 — JWT 서명(`SSO_SECRET`) + `exp`만으로 검증한다. "포탈에서 온 요청만 통과" 게이트는 정상 사용자를 차단하고(브라우저가 Referer를 비움) 위조도 가능해 보안 효용이 0이다. CSRF는 위 `SameSite=Lax` 쿠키로 충분.

### `app/page.tsx` — 세션 가드 + 역할 기반 기능 등급 (규칙 4·6·7)

```tsx
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { redirect } from 'next/navigation'

// 세션 사용자 정보 (재서명 JWT 페이로드) — 별도 파일 아님, 이 파일 상단에 함께 둔다
interface SSOPayload {
  sub: string
  name: string
  service: string
  role: 'viewer' | 'editor' | 'owner'   // 2026-05부 'admin' 발급 중단
  tenant_id?: string
  tenant_name?: string | null           // 표시 전용 (권한 결정 금지)
  service_owner_tenant_id?: string | null
  is_owner_tenant?: boolean
  borrowing_active?: boolean
  via?: 'owner' | 'global' | 'grant'    // 감사 전용 (권한 게이트 금지)
  scopes?: string[]
}

const COOKIE_NAME = 'my_service_sso'
function getSecret() {
  const s = process.env.SSO_SECRET
  if (!s) throw new Error('SSO_SECRET 미설정')
  return new TextEncoder().encode(s)
}

async function getSession(): Promise<SSOPayload | null> {
  // DEV_BYPASS: 포탈 없이 로컬에서 로그인·등급을 즉시 테스트 (production 에선 무시)
  if (process.env.DEV_BYPASS_SSO === 'true' && process.env.NODE_ENV !== 'production') {
    return buildDevMockSession()
  }
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    return payload as unknown as SSOPayload
  } catch {
    return null
  }
}

export default async function Page() {
  const session = await getSession()
  // 규칙 7: 세션 없으면 포탈로 곧장 튕기지 말고 자체 안내 페이지로
  if (!session) redirect('/login')

  // 규칙 6: 역할 기반 기능 등급 (role 만 사용; via/tenant_name 은 권한 게이트 금지)
  const canEdit = ['editor', 'owner'].includes(session.role)          // editor·owner
  const canManageMembers = session.role === 'owner'                    // owner
  // 규칙 4: 운영 admin 게이트 (cross-tenant 관리 등) — is_owner_tenant 필수
  const isServiceAdmin = session.is_owner_tenant === true && session.role === 'owner'

  return (
    <main>
      <p>{session.name} ({session.role})</p>
      {canEdit && <button>편집</button>}
      {canManageMembers && <button>멤버 관리</button>}
      {isServiceAdmin && <section>{/* 운영 관리 패널 — 여기에 cross-tenant 관리 UI를 넣으세요 */}운영 관리</section>}
      <a href="/auth/logout">로그아웃</a>
    </main>
  )
}

// 로컬 DEV_BYPASS mock — DEV_BYPASS_SCENARIO 로 5가지 전환 (기본 owner_native)
function buildDevMockSession(): SSOPayload {
  const s = process.env.DEV_BYPASS_SCENARIO ?? 'owner_native'
  const T_OWNER = '00000000-0000-0000-0000-000000000001'
  const T_USER  = '00000000-0000-0000-0000-000000000002'
  const base = { sub: 'dev@local', name: '개발자', service: 'my-service' } as const
  switch (s) {
    case 'super_admin_cross': return { ...base, role: 'owner',  tenant_id: T_USER,  tenant_name: 'B회사', service_owner_tenant_id: T_OWNER, is_owner_tenant: true,  borrowing_active: true,  via: 'grant' }
    case 'borrowed_owner':    return { ...base, role: 'owner',  tenant_id: T_USER,  tenant_name: 'B회사', service_owner_tenant_id: T_OWNER, is_owner_tenant: false, borrowing_active: true,  via: 'grant' }
    case 'borrowed_viewer':   return { ...base, role: 'viewer', tenant_id: T_USER,  tenant_name: 'B회사', service_owner_tenant_id: T_OWNER, is_owner_tenant: false, borrowing_active: true,  via: 'grant' }
    case 'global':            return { ...base, role: 'viewer', tenant_id: T_USER,  tenant_name: 'B회사', service_owner_tenant_id: null,    is_owner_tenant: false, borrowing_active: false, via: 'global' }
    default:                  return { ...base, role: 'owner',  tenant_id: T_OWNER, tenant_name: 'A회사', service_owner_tenant_id: T_OWNER, is_owner_tenant: true,  borrowing_active: false, via: 'owner' }
  }
}
```
> ⚠️ **UI 분기만으론 부족(보안)** — 편집·관리·삭제 같은 보호 동작은 **서버 라우트에서도 role 을 재검증**해야 한다(클라이언트 분기는 URL 직접 호출을 못 막음). 서버 가드 코드는 `references/multitenant.md` 참조.

### `app/login/page.tsx` — 공개 "포탈 대시보드로 접속" 안내 (규칙 7)

세션이 필요 없는 **공개 페이지**여야 한다(아니면 무한 리다이렉트).

```tsx
const PORTAL_URL = process.env.PORTAL_URL ?? 'http://localhost:13000'

export default function LoginPage() {
  return (
    <main>
      <h1>VibeWare 포탈을 통해 접속해 주세요</h1>
      <p>
        이 서비스는 회사 포탈(VibeWare) 대시보드를 통해서만 들어올 수 있어요.
        아래 버튼으로 포탈 대시보드로 이동한 뒤, 이 서비스 카드를 선택해 주세요.
        (포탈에 로그인돼 있지 않으면 자동으로 로그인 화면이 떠요.)
      </p>
      <a href={`${PORTAL_URL}/dashboard`}>VibeWare 포탈 대시보드 열기</a>
    </main>
  )
}
```

### `app/auth/logout/route.ts`

```ts
import { NextResponse } from 'next/server'
const COOKIE_NAME = 'my_service_sso'
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL('/login', req.url))
  res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 })
  return res
}
```

## 에러 프로토콜 (규칙 5)

| 코드 | 상황 | 처리 |
|---|---|---|
| `sso_required` | 세션 만료/직접 접근 (정상) | 자체 `/login` 안내 페이지 |
| `sso_failed` | 실제 검증 실패 (키·tenant 불일치) | 포탈 `?error=sso_failed` (관리자 로깅) |
| `sso_not_issued` | 키 미승인 (포탈이 진입 전 차단·발급 — 이 서비스는 emit·handle 안 함) | 관리자 승인 대기 안내 (코드 수정 대상 아님) |

에러가 보이면 **코드를 다시 고치기 전에 포탈부터 확인**하도록 안내:
`sso_failed` → `SSO_SECRET` 불일치 / "SSO 연동" 체크 누락(토큰 미수신).
`sso_not_issued` → 관리자 키 승인 대기. 배포 게이트/로그가 막히면 `get_pr_gate_status`·`get_deploy_logs`(vibeagent-infra-ops).

## 추가 자료 (필요할 때 같은 폴더에서 읽기)

- 멀티테넌트 데이터 격리·서버 role 재검증·borrowing·운영 admin 임명·DEV_BYPASS 5시나리오 상세가 필요하면 → **`references/multitenant.md`를 읽으세요**.
- 포탈 Bearer API 호출(조직/사용자 조회·아바타·스코프)이 필요하면 → **`references/portal-api.md`를 읽으세요**.
