---
description: VibeAgent 연결 코드를 입력해 로컬 AI를 VibeAgent에 연결하고, 곧바로 로컬 개발 환경까지 준비합니다.
argument-hint: <연결코드>
---
사용자가 입력한 VibeAgent 연결 코드: $ARGUMENTS

아래 명령으로 연결 코드를 sealed 토큰으로 교환하고 안전하게 저장하세요(코드는 1회용입니다):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/vibeagent-connect.mjs" "$ARGUMENTS"
```

- **성공하면 사용자에게 다시 묻지 말고 곧바로 이어서 진행하세요.** "연결됐어요. 이어서 이 프로젝트의 로컬 개발 환경을 준비할게요." 라고 한 줄만 알린 뒤, **`vibeagent-local-setup` 스킬을 따라 프로젝트 clone → 공개 환경변수 설정 → 개발 서버 실행까지 자동으로 수행**하세요. "준비해줘" 같은 사용자의 추가 입력을 기다리지 마세요.
- 실패(만료/소비)하면 VibeAgent 웹의 **"로컬 AI로 개발하기"** 에서 새 연결 코드를 발급받으라고 안내하세요.
