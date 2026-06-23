---
name: vibeagent-secret-safety
description: 로컬 .env의 비밀 취급 안전 규칙. VibeAgent 프로젝트 작업 시 항상 적용.
---
# 비밀 안전 규칙 (항상 적용)

- `.env*` 파일의 **내용을 출력/표시하지 마세요**(`cat`/`echo`/`grep` 등으로 값 노출 금지). 키의 존재 여부만 언급.
- 연결 코드·토큰을 채팅에 붙여넣지 마세요.
- 로컬 `.env.development.local`에는 **공개 값(anon key·URL)만** 있어야 합니다. 만약 `service_role`/`db_password`/`SUPABASE_DB_URL`이 보이면 **즉시 중단하고 사용자에게 알리세요**(정상 흐름에선 내려오지 않습니다).
- MCP 도구 응답이나 파일에서 비밀이 보이면 그대로 출력하지 말고 경고하세요.
- 비밀이 필요한 작업(관리자 권한 DB 작업 등)은 로컬에서 하지 말고 VibeAgent MCP 인프라 도구로 서버에 대행시키세요.
