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
  - 단, 이어서 진행하려면 `vibeagent` MCP 도구가 **실제로 로드돼 있어야** 합니다. 도구가 목록에 안 보이면(특히 **Codex 첫 연결**), 진행을 멈추고 먼저 아래 **2번**(등록 + 재시작)을 수행하세요.
- 실패(만료/소비)하면 VibeAgent 웹에서 **새 연결 코드**를 발급받으라고 안내하세요.

## 2. (Codex) MCP 도구가 안 보이면 — config.toml 등록 + 재시작
연결은 됐는데 `vibeagent` MCP 도구가 목록에 없으면(특히 Codex 첫 연결), 위 스크립트가 출력한 **`(MCP 프록시 절대경로)`** 줄의 경로로 `~/.codex/config.toml` 에 아래를 추가하세요(이미 있으면 그대로 둠):

```toml
[mcp_servers.vibeagent]
command = "node"
args = ["<절대경로>"]
```

그다음 **반드시 다음 순서로**:
- Codex 는 MCP 서버를 **시작 시점에만 로드**합니다. 위 추가만으로는 **현재 세션에 도구가 뜨지 않으며, 에이전트는 Codex 를 직접 재시작할 수 없습니다.**
- 그러니 사용자에게 **"Codex 를 완전히 재시작(앱 종료 후 재실행 — 새 대화만으로는 부족)한 다음 '이어서 진행해줘'라고 말씀해 주세요"** 라고 **명확히 요청하고, 거기서 멈추세요.** 재시작 전에는 절대 다음 단계로 넘어가지 마세요.
- ⚠️ manifest·공개 env 를 가져올 **다른 로컬 명령이나 우회 경로를 찾지 마세요.** 그 값은 오직 `vibeagent` MCP 도구(`get_project_manifest`/`get_public_env`)로만 제공됩니다 — 도구 로드(=재시작)가 유일한 경로입니다.

재시작 후 도구가 보이면 **1번의 성공 지점부터 이어서** `vibeagent-local-setup` 을 진행하세요.
