#!/usr/bin/env node
/**
 * vibeagent-mcp-proxy — stdio MCP 서버(로컬 프로세스).
 *
 * Claude Code 가 이 프로세스를 띄우면, initialize·tools/list 는 **로컬에서 즉시 응답**해
 * 도구가 네이티브로 뜨게 하고(인증 불필요), tools/call 만 **원격 /api/local-ai/mcp 로
 * 토큰을 붙여 전달**한다. 토큰은 /vibeagent-dev:connect 가 저장한 로컬 파일에서 매 호출 읽는다.
 *
 * 왜 이 방식인가: 원격 HTTP MCP + headersHelper 는 Claude Code 이슈 #41690 으로 토큰 주입이
 * silent no-op → 네이티브 도구가 안 뜬다. stdio 프록시는 그 한계를 우회한다(stdio 는 안정 지원).
 *
 * ⚠️ TOOLS 카탈로그는 src/lib/localAi/mcpServer.ts 와 **수동 동기화** 대상(도구 추가/변경 시 갱신).
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';

// stdio 모드엔 CLAUDE_CODE_MCP_SERVER_URL 이 없으므로 빌드 시 치환된 URL 을 사용.
const MCP_URL = process.env.CLAUDE_CODE_MCP_SERVER_URL || 'https://owen-vibeagent.vercel.app/api/local-ai/mcp';
const key = createHash('sha256').update(MCP_URL).digest('hex').slice(0, 16);
const TOKEN_PATH = join(homedir(), '.config', 'vibeagent', `${key}.json`);

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'vibeagent-local-ai', version: '0.1.0' };

const NOARGS = { type: 'object', properties: {} };
const TOOLS = [
  { name: 'status', description: '현재 브리지 연결의 프로젝트·스코프·인프라 준비 상태를 반환합니다.', inputSchema: NOARGS },
  { name: 'get_public_env', description: '로컬 .env 에 쓸 공개값(Supabase URL·anon key)만 반환합니다. secret 미포함.', inputSchema: NOARGS },
  { name: 'get_project_manifest', description: 'clone/로컬 실행에 필요한 repo·브랜치·배포주소(*.vercel.app) 정보를 반환합니다.', inputSchema: NOARGS },
  { name: 'get_supabase_schema', description: 'public 스키마의 테이블·컬럼 구조를 반환합니다(read-only).', inputSchema: NOARGS },
  { name: 'get_rls_status', description: '테이블별 RLS 활성 여부와 정책 목록을 반환합니다(read-only).', inputSchema: NOARGS },
  { name: 'get_migrations', description: '적용된 Supabase 마이그레이션 버전 목록을 반환합니다(read-only).', inputSchema: NOARGS },
  {
    name: 'apply_supabase_change',
    description: '테이블·컬럼을 생성하거나 컬럼을 추가합니다(DROP/DELETE 불가, owner + GitHub 쓰기 권한 필요).',
    inputSchema: {
      type: 'object',
      properties: {
        tables: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              columns: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    primaryKey: { type: 'boolean' },
                    nullable: { type: 'boolean' },
                    unique: { type: 'boolean' },
                    defaultValue: { type: 'string' },
                    references: { type: 'object', properties: { table: { type: 'string' }, column: { type: 'string' } } },
                  },
                  required: ['name', 'type'],
                },
              },
            },
            required: ['name', 'columns'],
          },
        },
      },
      required: ['tables'],
    },
  },
  { name: 'get_vercel_status', description: '최근 배포 상태를 반환합니다(read-only). 배포주소는 *.vercel.app 만 노출.', inputSchema: NOARGS },
  { name: 'request_vercel_deploy', description: 'production 재배포를 요청합니다(owner + GitHub 쓰기 권한 필요).', inputSchema: NOARGS },
  {
    name: 'get_deploy_logs',
    description: 'Vercel 빌드/배포 실패 로그를 반환합니다(read-only). 기본은 에러 요약, includeFull=true 면 전체 빌드 로그.',
    inputSchema: { type: 'object', properties: { includeFull: { type: 'boolean' } } },
  },
  {
    name: 'get_pr_gate_status',
    description: 'develop push 후 GitHub Actions PR 게이트(빌드 + AI 보안 게이트)의 상태와 실패/BLOCK 사유를 반환합니다(read-only).',
    inputSchema: NOARGS,
  },
  {
    name: 'list_vercel_env',
    description: 'Vercel 에 등록된 환경변수의 키 이름만 반환합니다(값 미포함, read-only).',
    inputSchema: NOARGS,
  },
  {
    name: 'set_vercel_env',
    description:
      'Vercel 환경변수를 추가/수정합니다(owner + GitHub 쓰기 권한 필요). ⚠️ 기존 키 덮어쓰기 전 사용자 확인 필수. 적용하려면 request_vercel_deploy 재배포 필요(소스 .env 미반영).',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string' }, value: { type: 'string' } },
      required: ['key', 'value'],
    },
  },
  {
    name: 'unset_vercel_env',
    description: 'Vercel 환경변수를 삭제합니다(잘못 설정한 키 회수용, owner + GitHub 쓰기 권한 필요). 적용하려면 재배포 필요.',
    inputSchema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] },
  },
  {
    name: 'list_storage_buckets',
    description: 'Supabase 스토리지 버킷 목록을 반환합니다(read-only).',
    inputSchema: NOARGS,
  },
  {
    name: 'create_storage_bucket',
    description: '스토리지 버킷을 생성합니다(파일 업로드 기능용, owner + GitHub 쓰기 권한 필요).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        public: { type: 'boolean' },
        fileSizeLimit: { type: 'number' },
        allowedMimeTypes: { type: 'array', items: { type: 'string' } },
      },
      required: ['name'],
    },
  },
];

function readToken() {
  try {
    const { token, expiresAt } = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
    if (!token) return null;
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return null;
    return token;
  } catch {
    return null;
  }
}

function send(msg) {
  try {
    process.stdout.write(JSON.stringify(msg) + '\n');
  } catch {
    /* stdout 닫힘(EPIPE) 등 — 무시 */
  }
}

function errorResult(id, text) {
  send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }], isError: true } });
}

async function forwardToolCall(id, params) {
  const token = readToken();
  if (!token) {
    return errorResult(id, 'VibeAgent 에 연결되어 있지 않거나 연결이 만료되었습니다. VibeAgent 연결 코드로 먼저 연결하세요.');
  }
  try {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params }),
    });
    if (res.status === 401) {
      return errorResult(id, 'VibeAgent 인증이 만료/취소되었습니다. VibeAgent 연결 코드로 다시 연결하세요.');
    }
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // enableJsonResponse=true 라 보통 JSON 이지만, SSE 형식이면 data: 라인에서 추출(방어적).
      const m = text.match(/data:\s*(\{[\s\S]*\})\s*$/m);
      data = m ? JSON.parse(m[1]) : null;
    }
    if (data && data.result) return send({ jsonrpc: '2.0', id, result: data.result });
    // JSON-RPC error 는 {code:number, message} 형태일 때만 그대로 전달 — 비-JSON-RPC 본문(503/400 등)은 도구 에러로 (review #7)
    if (data && typeof data.error === 'object' && data.error && typeof data.error.code === 'number') {
      return send({ jsonrpc: '2.0', id, error: data.error });
    }
    return errorResult(
      id,
      `VibeAgent 서버 오류 (HTTP ${res.status}).${res.status === 503 ? ' 서비스 일시 중지 — 잠시 후 다시 시도하세요.' : ''}`,
    );
  } catch (e) {
    return errorResult(id, `VibeAgent 서버 호출 실패: ${e?.message ?? e}`);
  }
}

// 장수 프로세스 — 부모(Claude Code) 종료/끊김에 견디게: EPIPE·미처리 예외에 조용히 종료 (review #8)
process.stdout.on('error', () => {});
process.on('uncaughtException', () => process.exit(0));
process.on('unhandledRejection', () => {});

const rl = createInterface({ input: process.stdin });
rl.on('close', () => process.exit(0));
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return;
  }
  const { id, method, params } = msg;

  // 알림(id 없음) — 응답하지 않는다 (notifications/initialized 등).
  if (id === undefined || id === null) return;

  switch (method) {
    case 'initialize':
      return send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        },
      });
    case 'tools/list':
      return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    case 'tools/call':
      return void forwardToolCall(id, params);
    case 'ping':
      return send({ jsonrpc: '2.0', id, result: {} });
    default:
      return send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
});
