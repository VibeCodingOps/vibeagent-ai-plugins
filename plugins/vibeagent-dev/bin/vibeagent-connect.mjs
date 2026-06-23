#!/usr/bin/env node
/**
 * VibeAgent connect — single-use connect-code 를 sealed bearer 로 교환하고 로컬에 저장(0600).
 * 원격 MCP URL 에서 exchange URL 을 도출한다. Claude(명령)·Codex(스킬) 양쪽에서 호출되는 벤더중립 스크립트.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const MCP_URL = process.env.CLAUDE_CODE_MCP_SERVER_URL || 'https://owen-vibeagent.vercel.app/api/local-ai/mcp';
const code = (process.argv[2] || '').trim(); // 슬래시 명령 $ARGUMENTS 의 끝 공백/개행 제거 (review #9)
if (!code) {
  process.stderr.write('연결 코드를 인자로 전달하세요: vibeagent-connect.mjs <코드>\n');
  process.exit(1);
}

const exchangeUrl = MCP_URL.replace(/\/api\/local-ai\/mcp\/?$/, '/api/local-ai/token/exchange');
const key = createHash('sha256').update(MCP_URL).digest('hex').slice(0, 16);
const tokenPath = join(homedir(), '.config', 'vibeagent', `${key}.json`);

try {
  const res = await fetch(exchangeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectCode: code }),
  });
  if (!res.ok) {
    process.stderr.write(
      `연결 실패 (HTTP ${res.status}). 코드가 만료/소비되었을 수 있어요. VibeAgent 웹에서 새 연결 코드를 발급받으세요.\n`,
    );
    process.exit(1);
  }
  const data = await res.json();
  mkdirSync(dirname(tokenPath), { recursive: true, mode: 0o700 });
  writeFileSync(
    tokenPath,
    JSON.stringify({ token: data.token, expiresAt: data.expiresAt, scopes: data.scopes }),
    { mode: 0o600 },
  );
  process.stdout.write('VibeAgent 연결 완료. 이제 "이 프로젝트를 로컬에서 개발할 수 있게 준비해줘"라고 요청하세요.\n');
  // Codex 폴백: ${PLUGIN_ROOT} 가 .mcp.json args 에서 안 풀릴 때 ~/.codex/config.toml 에 절대경로로 등록할 수 있게 출력.
  process.stdout.write(`(MCP 프록시 절대경로) ${join(dirname(fileURLToPath(import.meta.url)), 'vibeagent-mcp-proxy.mjs')}\n`);
} catch (e) {
  process.stderr.write(`연결 중 오류: ${e?.message ?? e}\n`);
  process.exit(1);
}
