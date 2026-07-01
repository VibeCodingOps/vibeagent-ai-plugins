# VibeWare 포탈 API 호출 (Bearer)

SSO 로그인 후 만든 서비스가 **포탈 데이터(조직·사용자·아바타 등)를 조회**해야 할 때 참조. 출처: VibeWare `external-api-reference.md`.

> 이 엔드포인트들은 **생성된 앱의 런타임 서버 코드**가 호출한다 — 네가 작성하는 라우트 코드의 일부이지, 에이전트(너)가 직접 호출하는 게 아니다. **`web_fetch`로 포탈을 치지 마라**: 작성 시점엔 유효한 60초 토큰이 없고, `web_fetch`는 `Authorization` 헤더를 떼므로 401만 돌아온다.

## 인증 모델

- 호출 인증 = **세션 쿠키에 담긴 재서명 JWT를 그대로 `Authorization: Bearer`** 로 전달. 서비스의 `SSO_SECRET`(서비스별 키)으로 HS256 서명된 토큰이면 된다.
- `payload.service` 클레임이 자기 서비스 ID와 정확히 일치해야 한다(다른 서비스 키로 서명하면 401).
- **Bearer 호출 자격** = 포탈에 SSO 키가 발급돼 있고(`sso_secret_enc IS NOT NULL`) `granted_scopes`가 1개 이상. 스코프 0개면 self-read 조차 401.

```ts
// 서버 라우트 안에서 — 세션 쿠키 토큰을 그대로 실어보냄
const token = (await cookies()).get('my_service_sso')?.value
const res = await fetch(`${process.env.PORTAL_URL}/api/org/users/${encodeURIComponent(email)}`, {
  headers: { Authorization: `Bearer ${token}` },
})
```

## 주요 엔드포인트

| 메서드 | 경로 | 요구 스코프 | 용도 |
|---|---|---|---|
| GET | `/api/org/users` | `graph.User.Read.All` (또는 `.app`) | 조직 구성원 전체 |
| GET | `/api/org/users/{email}` | 동일 (**본인 조회는 scope 면제**) | 특정 사용자 + 프로필 사진 |
| GET | `/api/graph/me/calendar` | `graph.Calendars.Read` (위임) | 호출자 본인 캘린더 |
| GET | `/api/graph/me/messages` | `graph.Mail.Read` (위임·민감) | 본인 받은편지함 |
| POST | `/api/graph/mail/send` | `graph.Mail.Send` (위임·민감) | 본인 명의 메일 발송 |
| GET | `/api/graph/presence/{email}` | `graph.Presence.Read.All` (**본인 면제**) | 프레즌스 |

전체 목록·요청/응답 스펙은 포탈 `external-api-reference.md` 참조.

## 스코프 신청

- 스코프 = "이 서비스가 포탈을 통해 호출할 수 있는 리소스 범위". **"SSO 발급 신청"** 전에 SSO 키 영역에서 필요한 스코프만 체크 → 관리자 승인.
- **위임 스코프**(`graph.me.*`, 캘린더·메일·프레즌스 등)는 해당 사용자가 **포탈에 최소 1회 로그인**했어야 한다(Microsoft refresh_token 저장). 미로그인 시 **403 `portal_login_required`** — 재시도로 안 풀리고 사용자가 포탈에서 동의해야 함.
- **민감 스코프**(Mail.Read/Send 등)는 매 호출마다 서버가 DB로 재확인 → 관리자가 회수하면 토큰이 유효해도 즉시 차단.

## 아바타(프로필 사진)

SSO JWT에는 사진이 없다(용량). 두 가지:
1. **이니셜 아바타**(권장): `name`으로 이니셜 생성.
2. **실제 사진**: `GET /api/org/users/{email}` 응답의 `photo`(data URI). **본인 조회는 별도 scope 없이** 가능 → 로그인 사용자 아바타 표시엔 추가 권한 불필요.

## 에러 / 키 회전

- `401` = 인증 실패(서명·service 불일치·스코프 0). `403` = 인증은 됐으나 권한 부족(role/scope). `403 portal_login_required` = 위임 스코프인데 사용자 포탈 미로그인.
- **키 회전**: 포탈에서 회전하면 이전 키는 즉시 무효 → 서비스 `SSO_SECRET`을 새 값으로 교체해야 함(회전 후 401 지속 = 옛 평문 잔존).
