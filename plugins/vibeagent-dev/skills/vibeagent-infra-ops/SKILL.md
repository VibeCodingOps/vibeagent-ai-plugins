---
name: vibeagent-infra-ops
description: Supabase/Vercel 조회·생성·배포는 VibeAgent MCP로 서버 대행. "테이블 추가", "스키마 확인", "RLS 확인", "배포해줘" 등 인프라 작업에 사용.
---
# 인프라 작업은 VibeAgent MCP로 (secretless)

로컬에는 비밀이 없으므로 Supabase/Vercel 권한 작업은 **VibeAgent MCP 도구가 서버 권한으로 대행**합니다. credential을 로컬에 요구하지 마세요.

- 스키마 조회: `get_supabase_schema`
- RLS 상태(로컬에서 데이터가 안 보일 때 진단): `get_rls_status`
- 마이그레이션: `get_migrations`
- 테이블/컬럼 생성: `apply_supabase_change` — **owner 권한 + GitHub 쓰기 권한 필요, 생성만(DROP/DELETE 불가)**
- Vercel 상태: `get_vercel_status` / 배포 요청: `request_vercel_deploy`
- 공개 env: `get_public_env`, 연결 상태: `status`

파괴적 작업(삭제/덮어쓰기)은 도구로 제공되지 않으며 VibeAgent 웹에서 승인이 필요합니다. 권한 거부(403)가 나오면 사용자의 역할/GitHub 권한을 확인하도록 안내하세요.

## 사용자에게 노출 가능한 정보 (중요)
사용자에게는 **GitHub 저장소 주소**와 **배포 주소(`*.vercel.app`)** 만 보여주세요. 다음 운영 인프라 식별자는 **절대 노출하거나 추측해서 만들지 마세요**:
- Vercel 대시보드/인스펙터 URL(`vercel.com/...`), org·team 이름, project id, deployment id(uid)
- Supabase project ref, 대시보드 URL, DB 호스트

배포 상태를 알릴 땐 `get_vercel_status` 가 주는 `state`·`phase`·`deployUrl`(*.vercel.app)·커밋 SHA 정도만 사용하세요. "배포 보기" 같은 대시보드 링크를 만들지 마세요.
