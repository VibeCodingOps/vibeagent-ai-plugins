---
name: vibeagent-local-setup
description: VibeAgent 프로젝트를 로컬에 clone하고 공개 환경변수를 설정한 뒤 개발 서버를 실행합니다. "프로젝트 로컬 세팅", "이 프로젝트 클론해서 실행", "로컬 개발 준비" 같은 요청에 사용.
---
# VibeAgent 로컬 개발 준비

사용자가 VibeAgent 프로젝트를 로컬에서 이어 개발하려 합니다. 다음 순서로 진행하세요.

## 0. 전제
- VibeAgent MCP에 연결돼 있어야 합니다(`/vibeagent-dev:connect <코드>` 완료). 연결이 없으면 먼저 안내하세요.
- 로컬에 `git`, `node`, `npm`이 필요합니다(`npm install`/`npm run dev`). 없으면 설치를 안내하세요(이건 어떤 MCP도 대신 못 합니다).

## 1. 프로젝트 정보
- VibeAgent MCP의 `get_project_manifest` 도구로 repo URL·브랜치·실행 정보를 가져오세요.

## 2. GitHub 인증 (private repo)
- `gh auth status`로 확인. 없으면 `gh auth login` 안내(skill: vibeagent-github-local-auth). **VibeAgent 서버 GitHub 토큰을 요청하지 마세요.**

## 3. Clone + 브랜치
- 사용자 본인 인증으로 `git clone <repoUrl>`
- 작업 브랜치 전환: `git checkout develop` (없으면 `git checkout -b develop`). **main 직접 push 금지** — 배포는 develop→PR→관리자 머지→main.

## 4. 공개 환경변수
- `get_public_env` 도구로 공개값(Supabase URL·anon key)을 받아 `.env.development.local`에 작성.
- `ready: false`면 **무한 백그라운드 폴링을 만들지 마세요(좀비 프로세스 금지).** `notReadyReason`으로 분기:
  - `'no_supabase'` → 이 프로젝트엔 Supabase 미연결. **기다려도 anon key가 안 생깁니다** — env 없이 그대로 진행하고, DB가 필요하면 그때 안내(`get_public_env` 재호출은 사용자가 DB를 연결한 뒤에만 의미 있음).
  - `'provisioning'` → 곧 준비됨. **최대 한 번만** 짧게 재시도하고, 그래도 없으면 "DB 준비되면 다시 '준비해줘' 하면 env까지 채울게요"라고 안내 후 **멈추세요**.
- **service_role/DB 비밀은 받지 않습니다(로컬 미배포).**

## 5. 설치 + 실행
- `npm install` → `npm run dev`

## 6. 로컬 한계 안내 (중요 — 먼저 알려주기)
- 이 앱은 **같은 클라우드 DB**에 붙습니다(샌드박스 아님 — 쓰면 실데이터 변경).
- **anon key + RLS**로 되는 기능은 로컬에서 동작하며, **Supabase Auth 로그인 시 read/write**가 됩니다.
- 단 **service_role을 쓰는 서버 라우트**(`supabaseKey is required.` 500)나 **DB 직결(DDL)**은 로컬에서 실패합니다 — 그런 작업은 VibeAgent MCP 도구로 서버에 대행시키세요(skill: vibeagent-infra-ops).
- 비로그인 상태면 RLS로 목록이 비어 보일 수 있습니다(정상). 로그인 후 확인하도록 안내하세요.

## 7. 배포 — 변경을 올릴 때 (중요)
- **기준 문서 = 프로젝트 repo의 `AGENTS.md`** (clone 후 자동으로 읽힘) — 배포 규칙의 진실원천이니 그걸 따르세요. 아래는 요약:
- 배포는 **`develop` 브랜치에 `git push` 만** 하면 됩니다. 그게 전부입니다.
- 그러면 GitHub Actions가 **자동으로**: develop→main PR 생성 → 빌드 + AI 보안 게이트 → 통과 시 자동 머지 → Vercel production 배포.
- **PR을 직접 만들거나(`gh pr create`) 머지하지 마세요. main에 직접 push 하지 마세요.** 워크플로우가 PR·게이트·머지를 다 처리하므로, 수동 PR은 충돌·중복이고 보안 게이트를 우회합니다.
- gh CLI는 PR 작업용이 아니라 **clone/push 인증용**입니다 — push 인증만 되면(키체인/편집기 로그인 등) gh 없어도 배포됩니다.
- 푸시 후 **빌드나 AI 보안 게이트가 막히면**: `get_pr_gate_status`(빌드·게이트 상태와 실패/BLOCK 사유)·`get_deploy_logs`(Vercel 빌드 로그)로 원인을 확인하세요(skill: vibeagent-infra-ops). 더 깊은 로그는 `gh run view`/`gh pr checks` 조회.
