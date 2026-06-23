---
name: vibeagent-github-local-auth
description: 로컬에서 private GitHub repo를 clone/push 하기 위한 GitHub 인증 안내. "GitHub 로그인", "clone 권한 없음", "push가 안 됨" 등에 사용.
---
# 로컬 GitHub 인증

private repo는 **사용자 본인의 GitHub 인증**으로 clone/push 합니다. VibeAgent 서버는 GitHub 토큰을 내려주지 않습니다.

- 확인: `gh auth status`
- 없으면: `gh auth login` (GitHub CLI) 또는 편집기(VS Code 등)의 GitHub 로그인.
- push는 **develop 브랜치로만**. main 직접 push 금지(Vercel 비멤버 author 차단 + 배포 정책).
- gh CLI는 **clone/push 인증 전용**입니다. **PR 생성/머지(`gh pr ...`)에 쓰지 마세요** — develop에 push 하면 워크플로우가 PR·보안 게이트·머지를 자동 처리합니다(수동 PR은 충돌·게이트 우회).
- 권한 오류(403/404)면 사용자의 GitHub 계정이 해당 org repo 멤버인지, SAML SSO 인가가 유효한지 확인하도록 안내.
- **VibeAgent 서버의 GitHub 토큰을 요청하지 마세요.**
