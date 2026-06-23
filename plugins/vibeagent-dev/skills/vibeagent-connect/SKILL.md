---
name: vibeagent-connect
description: VibeAgent 연결 코드로 로컬 AI를 VibeAgent에 연결합니다. 사용자가 짧은 영숫자 연결 코드를 붙여넣으며 "VibeAgent 연결", "연결 코드로 연결해줘", "로컬 AI 연결"을 요청할 때 사용. (Codex 의 기본 connect 경로 — Claude 에선 /vibeagent-dev:connect 명령도 가능.)
---
# VibeAgent 연결

사용자가 VibeAgent 웹 **"로컬 AI로 개발하기"** 에서 발급한 **연결 코드**(1회용)를 제공합니다.

## 1. 코드를 토큰으로 교환
사용자 메시지에서 연결 코드를 추출해 아래를 실행하세요(`<연결코드>` 치환):

```bash
node "${PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}/bin/vibeagent-connect.mjs" "<연결코드>"
```

- **성공하면 다시 묻지 말고 곧바로 이어서 진행하세요.** "연결됐어요. 이어서 이 프로젝트의 로컬 개발 환경을 준비할게요."라고 한 줄만 알린 뒤, **`vibeagent-local-setup` 스킬**을 따라 clone → 공개 env → 개발 서버 실행까지 자동 수행하세요. 추가 입력을 기다리지 마세요.
- 실패(만료/소비)하면 VibeAgent 웹에서 **새 연결 코드**를 발급받으라고 안내하세요.

## 2. (Codex) MCP 도구가 안 보이면 — config.toml 폴백
연결 후에도 `vibeagent` MCP 도구가 목록에 없으면, 위 스크립트가 출력한 **`(MCP 프록시 절대경로)`** 줄의 경로를 사용해 `~/.codex/config.toml` 에 아래를 추가하세요(이미 있으면 그대로 둠):

```toml
[mcp_servers.vibeagent]
command = "node"
args = ["<절대경로>"]
```

저장 후 Codex 를 재시작하면 도구가 뜹니다.
