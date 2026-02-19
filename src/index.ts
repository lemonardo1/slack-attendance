import { renderHtml } from "./renderHtml";
import { verifySlackSignature } from "./slackVerify";
import { generateSessionToken, createSessionCookie, getSessionFromCookie, verifyPassword } from "./auth";
import {
  getWeekStart,
  getWeekDates,
  processWeeklyStats,
  AttendanceRecord,
  getKoreaDateString
} from "./weeklyStats";
import { renderLoginPage, renderWeeklyStatsPage } from "./renderWeeklyStats";
import { sendWeeklySummary } from "./sendWeeklySummary";
import { renderTicketBoardPage, TicketItem, UserItem } from "./ticketBoard";
import { renderMeetingHomePage, renderMeetingDetailPage, MeetingWindow } from "./meetingPlanner";

interface SlackCommand {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

// In-memory session store (for simplicity)
const sessions = new Set<string>();
const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const AUTO_OUT_AFTER_HOURS_MS = 4 * 60 * 60 * 1000;

async function verifySlackRequest(request: Request, env: Env): Promise<boolean> {
  // Skip verification if SLACK_SIGNING_SECRET is not set (development mode)
  if (!env.SLACK_SIGNING_SECRET) {
    console.warn('SLACK_SIGNING_SECRET not set, skipping verification');
    return true;
  }

  return await verifySlackSignature(request, env.SLACK_SIGNING_SECRET);
}

function isAuthenticated(request: Request): boolean {
  const cookieHeader = request.headers.get('Cookie');
  const sessionToken = getSessionFromCookie(cookieHeader);
  return sessionToken ? sessions.has(sessionToken) : false;
}

type GoogleEnvKey =
  | 'GOOGLE_CLIENT_ID'
  | 'GOOGLE_CLIENT_SECRET'
  | 'GOOGLE_REDIRECT_URI'
  | 'GOOGLE_ALLOWED_DOMAIN';

function getRawEnvVar(env: Env, key: string): string | undefined {
  return (env as unknown as Record<string, string | undefined>)[key];
}

function getOptionalEnvVar(env: Env, key: GoogleEnvKey): string | undefined {
  return getRawEnvVar(env, key);
}

function isGoogleLoginEnabled(env: Env): boolean {
  return Boolean(
    getOptionalEnvVar(env, 'GOOGLE_CLIENT_ID') &&
    getOptionalEnvVar(env, 'GOOGLE_CLIENT_SECRET')
  );
}

function getGoogleRedirectUri(request: Request, env: Env): string {
  const configuredRedirectUri = getOptionalEnvVar(env, 'GOOGLE_REDIRECT_URI');
  if (configuredRedirectUri) {
    return configuredRedirectUri;
  }

  const callbackUrl = new URL('/stats/auth/google/callback', request.url);
  return callbackUrl.toString();
}

function createGoogleOauthState(): string {
  return generateSessionToken();
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const target = cookies.find((cookie) => cookie.startsWith(prefix));
  return target ? target.slice(prefix.length) : null;
}

function createGoogleOauthStateCookie(state: string): string {
  const maxAgeSeconds = Math.floor(GOOGLE_OAUTH_STATE_TTL_MS / 1000);
  return `${GOOGLE_OAUTH_STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}; Path=/`;
}

function clearGoogleOauthStateCookie(): string {
  return `${GOOGLE_OAUTH_STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`;
}

function isValidGoogleOauthState(request: Request, callbackState: string | null): boolean {
  if (!callbackState) return false;
  const cookieHeader = request.headers.get('Cookie');
  const cookieState = getCookieValue(cookieHeader, GOOGLE_OAUTH_STATE_COOKIE);
  if (!cookieState) return false;

  return cookieState === callbackState;
}

function isEmailAllowedByDomain(email: string, env: Env): boolean {
  const allowedDomainConfig = getOptionalEnvVar(env, 'GOOGLE_ALLOWED_DOMAIN');
  if (!allowedDomainConfig) {
    return true;
  }

  const allowedDomains = allowedDomainConfig
    .split(',')
    .map((d: string) => d.trim().toLowerCase())
    .filter(Boolean);

  if (allowedDomains.length === 0) {
    return true;
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  return allowedDomains.includes(domain);
}

type LastAttendanceRecord = {
  type: 'in' | 'out';
  timestamp: string;
  ts: number; // epoch seconds (UTC)
  is_auto: number; // 0 or 1
};

type MeetingPollRecord = {
  id: number;
  title: string;
  duration_minutes: number;
  timezone: string;
  windows_json: string;
  created_at: string;
};

function parseMeetingWindows(input: unknown): MeetingWindow[] | null {
  if (!Array.isArray(input)) return null;

  const parsed: MeetingWindow[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    const day = Number(record.day);
    const startHour = Number(record.startHour);
    const endHour = Number(record.endHour);

    if (!Number.isInteger(day) || day < 1 || day > 7) return null;
    if (!Number.isInteger(startHour) || !Number.isInteger(endHour)) return null;
    if (startHour < 0 || endHour > 24 || startHour >= endHour) return null;

    parsed.push({ day, startHour, endHour });
  }

  return parsed.length ? parsed : null;
}

function parseWindowsJson(windowsJson: string): MeetingWindow[] {
  try {
    const parsed = JSON.parse(windowsJson);
    return parseMeetingWindows(parsed) || [];
  } catch {
    return [];
  }
}

function buildValidSlotKeys(windows: MeetingWindow[], durationMinutes: number): string[] {
  const durationHours = durationMinutes / 60;
  const keys = new Set<string>();

  for (const window of windows) {
    const lastStartHour = window.endHour - durationHours;
    for (let hour = window.startHour; hour <= lastStartHour; hour++) {
      const slotKey = `${window.day}-${String(hour).padStart(2, '0')}`;
      keys.add(slotKey);
    }
  }

  return Array.from(keys).sort();
}

function sanitizeParticipantName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 40);
}

function getNextKst4amUtcMsFromIn(inUtcMs: number): number {
  // Represent Korea time by shifting UTC by +9h and using UTC getters/setters.
  const inKst = new Date(inUtcMs + KST_OFFSET_MS);
  const cutoffKst = new Date(inKst.getTime());
  cutoffKst.setUTCHours(4, 0, 0, 0);
  if (inKst.getUTCHours() >= 4) {
    cutoffKst.setUTCDate(cutoffKst.getUTCDate() + 1);
  }
  // Convert the KST-represented timestamp back to real UTC ms.
  return cutoffKst.getTime() - KST_OFFSET_MS;
}

async function getLastAttendanceRecord(env: Env, userId: string, teamId: string): Promise<LastAttendanceRecord | null> {
  const stmt = env.DB.prepare(`
    SELECT 
      type,
      timestamp,
      CAST(strftime('%s', timestamp) AS INTEGER) AS ts,
      COALESCE(is_auto, 0) AS is_auto
    FROM attendance
    WHERE user_id = ? AND team_id = ?
    ORDER BY timestamp DESC
    LIMIT 1
  `);
  const { results } = await stmt.bind(userId, teamId).all();
  if (!results || results.length === 0) return null;
  return results[0] as unknown as LastAttendanceRecord;
}

async function findMatchingInForOut(env: Env, userId: string, teamId: string, outTimestamp: string): Promise<{ timestamp: string; ts: number } | null> {
  const stmt = env.DB.prepare(`
    SELECT 
      timestamp,
      CAST(strftime('%s', timestamp) AS INTEGER) AS ts
    FROM attendance
    WHERE user_id = ? AND team_id = ? AND type = 'in' AND timestamp < ?
    ORDER BY timestamp DESC
    LIMIT 1
  `);
  const { results } = await stmt.bind(userId, teamId, outTimestamp).all();
  if (!results || results.length === 0) return null;
  return results[0] as unknown as { timestamp: string; ts: number };
}

async function insertAutoOut(env: Env, userId: string, userName: string, teamId: string, outUtcEpochSec: number): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO attendance (user_id, user_name, team_id, type, timestamp, is_auto)
    VALUES (?, ?, ?, 'out', datetime(?, 'unixepoch'), 1)
  `)
    .bind(userId, userName, teamId, outUtcEpochSec)
    .run();
}

async function maybeAutoCloseOpenInForUser(command: SlackCommand, env: Env, nowUtcMs: number): Promise<boolean> {
  const last = await getLastAttendanceRecord(env, command.user_id, command.team_id);
  if (!last || last.type !== 'in') return false;

  const inUtcMs = last.ts * 1000;
  const cutoffUtcMs = getNextKst4amUtcMsFromIn(inUtcMs);

  if (nowUtcMs < cutoffUtcMs) return false;

  const autoOutUtcMs = inUtcMs + AUTO_OUT_AFTER_HOURS_MS;
  await insertAutoOut(env, command.user_id, command.user_name, command.team_id, Math.floor(autoOutUtcMs / 1000));
  return true;
}

async function sendEphemeralToResponseUrl(ctx: ExecutionContext, responseUrl: string, text: string): Promise<void> {
  ctx.waitUntil(
    fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        console.warn('Failed to send ephemeral response_url message:', res.status, await res.text());
      }
    }).catch((err) => {
      console.warn('Failed to send ephemeral response_url message:', err);
    })
  );
}

async function handleSlackCommand(command: SlackCommand, env: Env, ctx: ExecutionContext): Promise<Response> {
  const { command: cmd } = command;

  // Route commands
  switch (cmd) {
    case '/create':
      return handleWorkLog(command, env);
    case '/assign':
      return handleAssignCommand(command, env);
    case '/start':
      return handleStartCommand(command, env);
    case '/end':
      return handleEndCommand(command, env);
    case '/in':
    case '/out':
      return handleAttendance(command, env, ctx);
    default:
      return new Response(
        JSON.stringify({
          response_type: "ephemeral",
          text: "❌ 알 수 없는 커맨드입니다. `/in`, `/out`, `/create`, `/assign`, `/start`, `/end`를 사용해주세요.",
        }),
        { headers: { "content-type": "application/json" } }
      );
  }
}

async function handleAttendance(command: SlackCommand, env: Env, ctx: ExecutionContext): Promise<Response> {
  const { user_id, user_name, team_id, command: cmd } = command;
  const type = cmd === '/in' ? 'in' : 'out';

  try {
    const nowUtcMs = Date.now();

    if (type === 'in') {
      await maybeAutoCloseOpenInForUser(command, env, nowUtcMs);
    }

    const lastRecord = await getLastAttendanceRecord(env, user_id, team_id);

    if (type === 'in' && lastRecord && lastRecord.type === 'out' && lastRecord.is_auto === 1) {
      const matchedIn = await findMatchingInForOut(env, user_id, team_id, lastRecord.timestamp);
      const inTimeKst = matchedIn
        ? new Date(matchedIn.ts * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
        : '(알 수 없음)';
      const outTimeKst = new Date(lastRecord.ts * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

      await sendEphemeralToResponseUrl(
        ctx,
        command.response_url,
        `⚠️ 새벽 4시까지 \`/out\` 로그가 없어 이전 출근이 자동 퇴근 처리되었습니다.\n- 출근: ${inTimeKst}\n- 자동 퇴근(출근+4시간): ${outTimeKst}`
      );
    }

    if (lastRecord) {
      if (type === 'in' && lastRecord.type === 'in') {
        const lastTime = new Date(lastRecord.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        return new Response(JSON.stringify({ response_type: "ephemeral", text: `❌ 이미 출근 체크되어 있습니다!\n마지막 출근: ${lastTime}\n먼저 \`/out\`으로 퇴근 체크를 해주세요.` }), { headers: { "content-type": "application/json" } });
      }
      if (type === 'out' && lastRecord.type === 'out') {
        const lastTime = new Date(lastRecord.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        return new Response(JSON.stringify({ response_type: "ephemeral", text: `❌ 이미 퇴근 체크되어 있습니다!\n마지막 퇴근: ${lastTime}\n먼저 \`/in\`으로 출근 체크를 해주세요.` }), { headers: { "content-type": "application/json" } });
      }
    }

    await env.DB.prepare("INSERT INTO attendance (user_id, user_name, team_id, type) VALUES (?, ?, ?, ?)").bind(user_id, user_name, team_id, type).run();

    const emoji = type === 'in' ? '👋' : '🏃';
    const message = type === 'in' ? '출근' : '퇴근';
    const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    return new Response(JSON.stringify({ response_type: "in_channel", text: `${emoji} <@${user_id}>님이 ${message} 체크했습니다! (${koreanTime})` }), { headers: { "content-type": "application/json" } });
  } catch (error) {
    console.error("Database error:", error);
    return new Response(JSON.stringify({ response_type: "ephemeral", text: "❌ 출퇴근 체크 중 오류가 발생했습니다." }), { headers: { "content-type": "application/json" } });
  }
}

async function handleWorkLog(command: SlackCommand, env: Env): Promise<Response> {
  const { user_id, user_name, team_id, text } = command;

  if (!text || text.trim() === '') {
    return new Response(JSON.stringify({ response_type: "ephemeral", text: "❌ 업무 내용을 입력해주세요.\n사용법: `/create 업무 내용`" }), { headers: { "content-type": "application/json" } });
  }

  try {
    // 1. Generate next FE-XXX ID
    const lastTicket = await env.DB.prepare("SELECT id FROM work_tickets ORDER BY id DESC LIMIT 1").first();
    const nextId = (lastTicket ? (lastTicket.id as number) : 0) + 1;
    const ticketTitle = `FE-${String(nextId).padStart(3, '0')}`;
    const ticketDescription = text.trim();

    // 2. Insert into work_tickets
    const nextSortOrder = await getNextTicketSortOrder(env, null);
    await env.DB.prepare(`
      INSERT INTO work_tickets (
        user_id,
        user_name,
        team_id,
        ticket_title,
        ticket_description,
        status,
        parent_ticket_id,
        sort_order
      ) VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?)
    `).bind(user_id, user_name, team_id, ticketTitle, ticketDescription, nextSortOrder).run();

    // Also insert into work_logs for historical consistency (optional/legacy)
    await env.DB.prepare("INSERT INTO work_logs (user_id, user_name, team_id, log_content) VALUES (?, ?, ?, ?)")
      .bind(user_id, user_name, team_id, `[${ticketTitle}] ${ticketDescription}`)
      .run();

    return new Response(
      JSON.stringify({
        response_type: "in_channel",
        text: `📝 <@${user_id}>님이 새 업무 티켓을 생성했습니다!\n\n*ID*: ${ticketTitle}\n*내용*: ${ticketDescription}\n\n시작하려면 \`/start ${ticketTitle}\`, 담당자를 지정하려면 \`/assign ${ticketTitle} @담당자\`를 입력하세요.`,
      }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (error) {
    console.error("Database error:", error);
    return new Response(JSON.stringify({ response_type: "ephemeral", text: "❌ 티켓 생성 중 오류가 발생했습니다." }), { headers: { "content-type": "application/json" } });
  }
}

async function handleAssignCommand(command: SlackCommand, env: Env): Promise<Response> {
  const { team_id, text } = command;
  // Format: FE-001 @user
  const match = text.trim().match(/^(FE-\d+)\s+<@([^>|]+)(?:\|([^>]*))?>/);

  if (!match) {
    return new Response(JSON.stringify({ response_type: "ephemeral", text: "❌ 사용법이 올바르지 않습니다.\n사용법: `/assign FE-001 @담당자`" }), { headers: { "content-type": "application/json" } });
  }

  const [_, ticketTitle, assigneeId, assigneeNamePart] = match;
  const assigneeName = assigneeNamePart || assigneeId;

  try {
    const result = await env.DB.prepare("UPDATE work_tickets SET assignee_id = ?, assignee_name = ? WHERE ticket_title = ? AND (team_id = ? OR team_id = 'WEB')")
      .bind(assigneeId, assigneeName, ticketTitle, team_id).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ response_type: "ephemeral", text: `❌ 티켓을 찾을 수 없습니다: ${ticketTitle}` }), { headers: { "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ response_type: "in_channel", text: `👤 <@${command.user_id}>님이 ${ticketTitle} 티켓의 담당자를 <@${assigneeId}>님으로 변경했습니다.` }), { headers: { "content-type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ response_type: "ephemeral", text: "❌ 담당자 변경 중 오류가 발생했습니다." }), { headers: { "content-type": "application/json" } });
  }
}

async function handleStartCommand(command: SlackCommand, env: Env): Promise<Response> {
  const { team_id, text } = command;
  const ticketTitle = text.trim();

  if (!/^FE-\d+$/.test(ticketTitle)) {
    return new Response(JSON.stringify({ response_type: "ephemeral", text: "❌ 올바른 티켓 ID(예: FE-001)를 입력해주세요." }), { headers: { "content-type": "application/json" } });
  }

  try {
    const result = await env.DB.prepare("UPDATE work_tickets SET status = 'in_progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE ticket_title = ? AND (team_id = ? OR team_id = 'WEB')")
      .bind(ticketTitle, team_id).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ response_type: "ephemeral", text: `❌ 티켓을 찾을 수 없습니다: ${ticketTitle}` }), { headers: { "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ response_type: "in_channel", text: `▶️ <@${command.user_id}>님이 ${ticketTitle} 업무를 시작했습니다.` }), { headers: { "content-type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ response_type: "ephemeral", text: "❌ 업무 시작 중 오류가 발생했습니다." }), { headers: { "content-type": "application/json" } });
  }
}

async function handleEndCommand(command: SlackCommand, env: Env): Promise<Response> {
  const { team_id, text } = command;
  const ticketTitle = text.trim();

  if (!/^FE-\d+$/.test(ticketTitle)) {
    return new Response(JSON.stringify({ response_type: "ephemeral", text: "❌ 올바른 티켓 ID(예: FE-001)를 입력해주세요." }), { headers: { "content-type": "application/json" } });
  }

  try {
    const result = await env.DB.prepare("UPDATE work_tickets SET status = 'completed', completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP) WHERE ticket_title = ? AND (team_id = ? OR team_id = 'WEB')")
      .bind(ticketTitle, team_id).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ response_type: "ephemeral", text: `❌ 티켓을 찾을 수 없습니다: ${ticketTitle}` }), { headers: { "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ response_type: "in_channel", text: `✅ <@${command.user_id}>님이 ${ticketTitle} 업무를 완료했습니다!` }), { headers: { "content-type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ response_type: "ephemeral", text: "❌ 업무 완료 중 오류가 발생했습니다." }), { headers: { "content-type": "application/json" } });
  }
}

async function getNextTicketSortOrder(env: Env, parentTicketId: number | null): Promise<number> {
  if (parentTicketId === null) {
    const row = await env.DB.prepare(`
      SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
      FROM work_tickets
      WHERE parent_ticket_id IS NULL
    `).first<{ next_order: number }>();
    return Number(row?.next_order || 1);
  }

  const row = await env.DB.prepare(`
    SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
    FROM work_tickets
    WHERE parent_ticket_id = ?
  `).bind(parentTicketId).first<{ next_order: number }>();

  return Number(row?.next_order || 1);
}

async function handleCreateTicketFromWeb(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { description: string; parent_ticket_id?: number | null };

    if (!body.description || body.description.trim() === '') {
      return new Response(JSON.stringify({ error: '업무 내용을 입력해주세요' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const ticketDescription = body.description.trim();
    const parentTicketId = body.parent_ticket_id ?? null;
    if (parentTicketId !== null && (!Number.isInteger(parentTicketId) || parentTicketId <= 0)) {
      return new Response(JSON.stringify({ error: '올바르지 않은 상위 티켓입니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (parentTicketId !== null) {
      const parentExists = await env.DB.prepare("SELECT id FROM work_tickets WHERE id = ? LIMIT 1")
        .bind(parentTicketId)
        .first<{ id: number }>();
      if (!parentExists) {
        return new Response(JSON.stringify({ error: '상위 티켓을 찾을 수 없습니다' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const lastTicket = await env.DB.prepare("SELECT id FROM work_tickets ORDER BY id DESC LIMIT 1").first();
    const nextId = (lastTicket ? (lastTicket.id as number) : 0) + 1;
    const ticketTitle = `FE-${String(nextId).padStart(3, '0')}`;
    const defaultTeamId = 'WEB';
    const defaultUserId = 'web-user';
    const defaultUserName = 'Web User';

    const nextSortOrder = await getNextTicketSortOrder(env, parentTicketId);
    const result = await env.DB.prepare(
      `INSERT INTO work_tickets (
        user_id,
        user_name,
        team_id,
        ticket_title,
        ticket_description,
        status,
        parent_ticket_id,
        sort_order
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).bind(defaultUserId, defaultUserName, defaultTeamId, ticketTitle, ticketDescription, parentTicketId, nextSortOrder).run();

    return new Response(
      JSON.stringify({
        success: true,
        ticket_id: result.meta.last_row_id,
        ticket_title: ticketTitle,
        ticket_description: ticketDescription,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Create ticket error:", error);
    return new Response(JSON.stringify({ error: '티켓 생성 중 오류가 발생했습니다' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleUpdateTicketStatus(request: Request, env: Env, ticketId: number): Promise<Response> {
  try {
    const body = await request.json() as { status: string };

    if (!['pending', 'in_progress', 'completed'].includes(body.status)) {
      return new Response(
        JSON.stringify({ error: '올바르지 않은 상태값입니다' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update status and set timestamps automatically
    if (body.status === 'in_progress') {
      // 진행으로 변경 시 started_at이 없으면 현재 시간으로 설정
      await env.DB.prepare(
        "UPDATE work_tickets SET status = ?, started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE id = ?"
      ).bind(body.status, ticketId).run();
    } else if (body.status === 'completed') {
      // 완료로 변경 시 completed_at이 없으면 현재 시간으로 설정
      await env.DB.prepare(
        "UPDATE work_tickets SET status = ?, completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP) WHERE id = ?"
      ).bind(body.status, ticketId).run();
    } else {
      // 대기로 변경 시 상태만 변경
      await env.DB.prepare(
        "UPDATE work_tickets SET status = ? WHERE id = ?"
      ).bind(body.status, ticketId).run();
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Update status error:", error);
    return new Response(
      JSON.stringify({ error: '상태 변경 중 오류가 발생했습니다' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleUpdateTicketAssignee(request: Request, env: Env, ticketId: number): Promise<Response> {
  try {
    const body = await request.json() as { assignee_id: string; assignee_name: string };

    await env.DB.prepare(
      "UPDATE work_tickets SET assignee_id = ?, assignee_name = ? WHERE id = ?"
    ).bind(body.assignee_id, body.assignee_name, ticketId).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Update assignee error:", error);
    return new Response(JSON.stringify({ error: '담당자 변경 중 오류가 발생했습니다' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleDeleteTicket(request: Request, env: Env, ticketId: number): Promise<Response> {
  try {
    await env.DB.prepare(`
      WITH RECURSIVE descendants AS (
        SELECT id
        FROM work_tickets
        WHERE id = ?
        UNION ALL
        SELECT wt.id
        FROM work_tickets wt
        INNER JOIN descendants d ON wt.parent_ticket_id = d.id
      )
      DELETE FROM work_tickets
      WHERE id IN (SELECT id FROM descendants)
    `).bind(ticketId).run();
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Delete ticket error:", error);
    return new Response(JSON.stringify({ error: '티켓 삭제 중 오류가 발생했습니다' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleUpdateTicketHierarchy(request: Request, env: Env, ticketId: number): Promise<Response> {
  try {
    const body = await request.json() as { parent_ticket_id?: number | null };
    const parentTicketId = body.parent_ticket_id ?? null;

    if (parentTicketId !== null && (!Number.isInteger(parentTicketId) || parentTicketId <= 0)) {
      return new Response(JSON.stringify({ error: '올바르지 않은 parent_ticket_id 입니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentTicket = await env.DB.prepare("SELECT id FROM work_tickets WHERE id = ? LIMIT 1")
      .bind(ticketId)
      .first<{ id: number }>();
    if (!currentTicket) {
      return new Response(JSON.stringify({ error: '티켓을 찾을 수 없습니다' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (parentTicketId === ticketId) {
      return new Response(JSON.stringify({ error: '자기 자신을 상위 티켓으로 설정할 수 없습니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (parentTicketId !== null) {
      const parentTicket = await env.DB.prepare("SELECT id FROM work_tickets WHERE id = ? LIMIT 1")
        .bind(parentTicketId)
        .first<{ id: number }>();
      if (!parentTicket) {
        return new Response(JSON.stringify({ error: '상위 티켓을 찾을 수 없습니다' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const cycleHit = await env.DB.prepare(`
        WITH RECURSIVE descendants AS (
          SELECT id
          FROM work_tickets
          WHERE parent_ticket_id = ?
          UNION ALL
          SELECT wt.id
          FROM work_tickets wt
          INNER JOIN descendants d ON wt.parent_ticket_id = d.id
        )
        SELECT id
        FROM descendants
        WHERE id = ?
        LIMIT 1
      `).bind(ticketId, parentTicketId).first<{ id: number }>();

      if (cycleHit) {
        return new Response(JSON.stringify({ error: '하위 티켓 아래로는 이동할 수 없습니다' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const nextSortOrder = await getNextTicketSortOrder(env, parentTicketId);
    await env.DB.prepare(`
      UPDATE work_tickets
      SET parent_ticket_id = ?, sort_order = ?
      WHERE id = ?
    `).bind(parentTicketId, nextSortOrder, ticketId).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Update hierarchy error:", error);
    return new Response(JSON.stringify({ error: '계층 변경 중 오류가 발생했습니다' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleUpdateTicketCreator(request: Request, env: Env, ticketId: number): Promise<Response> {
  try {
    const body = await request.json() as { user_id: string; user_name: string };

    if (!body.user_name || body.user_name.trim() === '') {
      return new Response(
        JSON.stringify({ error: '작성자 이름을 입력해주세요' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await env.DB.prepare(
      "UPDATE work_tickets SET user_id = ?, user_name = ? WHERE id = ?"
    ).bind(body.user_id, body.user_name, ticketId).run();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Update creator error:", error);
    return new Response(
      JSON.stringify({ error: '작성자 변경 중 오류가 발생했습니다' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleUpdateTicketDate(request: Request, env: Env, ticketId: number): Promise<Response> {
  try {
    const body = await request.json() as { date_type: string; date_value: string | null };

    if (!['start', 'end'].includes(body.date_type)) {
      return new Response(
        JSON.stringify({ error: '올바르지 않은 날짜 타입입니다' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const column = body.date_type === 'start' ? 'started_at' : 'completed_at';

    if (body.date_value === null) {
      // Clear date
      await env.DB.prepare(
        `UPDATE work_tickets SET ${column} = NULL WHERE id = ?`
      ).bind(ticketId).run();
    } else {
      // Set date
      await env.DB.prepare(
        `UPDATE work_tickets SET ${column} = ? WHERE id = ?`
      ).bind(body.date_value, ticketId).run();
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Update date error:", error);
    return new Response(
      JSON.stringify({ error: '날짜 변경 중 오류가 발생했습니다' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleUpdateTicketDescription(request: Request, env: Env, ticketId: number): Promise<Response> {
  try {
    const body = await request.json() as { description: string };

    if (!body.description || body.description.trim() === '') {
      return new Response(JSON.stringify({ error: '업무 내용을 입력해주세요' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await env.DB.prepare("UPDATE work_tickets SET ticket_description = ? WHERE id = ?").bind(body.description.trim(), ticketId).run();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Update description error:", error);
    return new Response(JSON.stringify({ error: '업무 내용 변경 중 오류가 발생했습니다' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function showMeetingsHome(request: Request): Promise<Response> {
  return new Response(renderMeetingHomePage(isAuthenticated(request)), {
    headers: { "content-type": "text/html" },
  });
}

async function showMeetingDetail(meetingId: number): Promise<Response> {
  return new Response(renderMeetingDetailPage(meetingId), {
    headers: { "content-type": "text/html" },
  });
}

async function handleCreateMeeting(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as {
      title?: string;
      duration_minutes?: number;
      timezone?: string;
      windows?: unknown;
    };

    const title = (body.title || "").trim();
    if (!title) {
      return new Response(JSON.stringify({ error: "회의 제목을 입력해주세요." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const durationMinutes = Number(body.duration_minutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 60 || durationMinutes > 240 || durationMinutes % 60 !== 0) {
      return new Response(JSON.stringify({ error: "회의 시간은 1시간 단위(60~240분)로 설정해주세요." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const windows = parseMeetingWindows(body.windows);
    if (!windows) {
      return new Response(JSON.stringify({ error: "시간 범위 형식이 올바르지 않습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validSlots = buildValidSlotKeys(windows, durationMinutes);
    if (validSlots.length === 0) {
      return new Response(JSON.stringify({ error: "설정한 시간 범위에서 가능한 회의 시작 시간이 없습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const timezone = (body.timezone || "Asia/Seoul").trim() || "Asia/Seoul";
    const result = await env.DB.prepare(`
      INSERT INTO meeting_polls (title, duration_minutes, timezone, windows_json)
      VALUES (?, ?, ?, ?)
    `)
      .bind(title.slice(0, 120), durationMinutes, timezone.slice(0, 64), JSON.stringify(windows))
      .run();

    return new Response(JSON.stringify({
      success: true,
      meeting_id: result.meta.last_row_id,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create meeting error:", error);
    return new Response(JSON.stringify({ error: "회의 생성 중 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function parseFirstJsonObject(input: string): unknown | null {
  const trimmed = input.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through and try fenced/embedded JSON extraction.
  }

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // continue
    }
  }

  const firstCurly = trimmed.indexOf('{');
  const lastCurly = trimmed.lastIndexOf('}');
  if (firstCurly >= 0 && lastCurly > firstCurly) {
    try {
      return JSON.parse(trimmed.slice(firstCurly, lastCurly + 1));
    } catch {
      return null;
    }
  }
  return null;
}

async function handleGenerateMeetingPlanByAi(request: Request, env: Env): Promise<Response> {
  if (!isAuthenticated(request)) {
    return new Response(JSON.stringify({ error: "로그인 후 사용할 수 있습니다." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const geminiApiKey = getRawEnvVar(env, 'GEMINI_API_KEY');
  if (!geminiApiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY가 설정되지 않았습니다." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json() as { title?: string };
    const roughTitle = (body.title || "").trim();
    if (!roughTitle) {
      return new Response(JSON.stringify({ error: "회의 제목을 입력해주세요." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prompt = [
      "회의 일정 생성 도우미입니다.",
      "입력된 회의 제목을 바탕으로 한국 팀 기준의 기본 회의 시간/요일 범위를 추천하세요.",
      "반드시 JSON만 출력하세요. 설명문/마크다운 금지.",
      "JSON 스키마:",
      "{",
      '  "title": "정리된 회의 제목 (최대 120자)",',
      '  "duration_minutes": 60 | 120 | 180 | 240,',
      '  "windows": [{ "day": 1-7, "startHour": 0-23, "endHour": 1-24 }]',
      "}",
      "규칙:",
      "- day: 1=월, ..., 7=일",
      "- 각 window는 startHour < endHour",
      "- windows는 1~4개",
      "- 일반적인 업무 회의는 평일(월~금) 위주로 추천",
      "",
      `회의 제목: ${roughTitle}`,
    ].join('\n');

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`;
    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('Gemini API error:', aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI 일정 생성 중 외부 API 오류가 발생했습니다." }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const aiText = aiData.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || '';
    const parsed = parseFirstJsonObject(aiText) as {
      title?: string;
      duration_minutes?: number;
      windows?: unknown;
    } | null;

    if (!parsed) {
      return new Response(JSON.stringify({ error: "AI 응답 형식을 해석하지 못했습니다." }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const title = String(parsed.title || roughTitle).trim().slice(0, 120) || roughTitle.slice(0, 120);
    const durationMinutes = Number(parsed.duration_minutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 60 || durationMinutes > 240 || durationMinutes % 60 !== 0) {
      return new Response(JSON.stringify({ error: "AI가 유효한 회의 시간을 생성하지 못했습니다." }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const windows = parseMeetingWindows(parsed.windows);
    if (!windows) {
      return new Response(JSON.stringify({ error: "AI가 유효한 시간 범위를 생성하지 못했습니다." }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validSlots = buildValidSlotKeys(windows, durationMinutes);
    if (!validSlots.length) {
      return new Response(JSON.stringify({ error: "AI 추천 시간 범위에서 가능한 슬롯이 없습니다." }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      title,
      duration_minutes: durationMinutes,
      windows,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate AI meeting plan error:", error);
    return new Response(JSON.stringify({ error: "AI 일정 생성 중 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleListMeetings(env: Env): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(`
      SELECT id, title, duration_minutes, timezone, windows_json, created_at
      FROM meeting_polls
      ORDER BY created_at DESC
      LIMIT 30
    `).all();

    const meetings = ((results || []) as unknown as MeetingPollRecord[]).map((m) => ({
      id: m.id,
      title: m.title,
      duration_minutes: m.duration_minutes,
      timezone: m.timezone,
      created_at: m.created_at,
      windows: parseWindowsJson(m.windows_json),
    }));

    return new Response(JSON.stringify({ meetings }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List meetings error:", error);
    return new Response(JSON.stringify({ error: "회의 목록 조회 중 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleGetMeeting(env: Env, meetingId: number, participantNameRaw: string | null): Promise<Response> {
  try {
    const meeting = await env.DB.prepare(`
      SELECT id, title, duration_minutes, timezone, windows_json, created_at
      FROM meeting_polls
      WHERE id = ?
      LIMIT 1
    `).bind(meetingId).first<MeetingPollRecord>();

    if (!meeting) {
      return new Response(JSON.stringify({ error: "회의를 찾을 수 없습니다." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const windows = parseWindowsJson(meeting.windows_json);
    const validSlots = buildValidSlotKeys(windows, meeting.duration_minutes);

    const participantName = sanitizeParticipantName(participantNameRaw || "");
    let participantSlots: string[] = [];
    if (participantName) {
      const { results } = await env.DB.prepare(`
        SELECT slot_key
        FROM meeting_availability
        WHERE meeting_id = ? AND participant_name = ?
      `).bind(meetingId, participantName).all<{ slot_key: string }>();
      participantSlots = (results || []).map((r) => r.slot_key);
    }

    const { results: countResults } = await env.DB.prepare(`
      SELECT slot_key, COUNT(DISTINCT participant_name) as participant_count
      FROM meeting_availability
      WHERE meeting_id = ?
      GROUP BY slot_key
    `).bind(meetingId).all<{ slot_key: string; participant_count: number }>();

    const { results: participantResults } = await env.DB.prepare(`
      SELECT DISTINCT participant_name
      FROM meeting_availability
      WHERE meeting_id = ?
      ORDER BY participant_name
    `).bind(meetingId).all<{ participant_name: string }>();

    const validSet = new Set(validSlots);
    const slotCounts: Record<string, number> = {};
    (countResults || []).forEach((row) => {
      if (validSet.has(row.slot_key)) {
        slotCounts[row.slot_key] = Number(row.participant_count || 0);
      }
    });

    const participants = (participantResults || []).map((r) => r.participant_name);

    return new Response(JSON.stringify({
      meeting: {
        id: meeting.id,
        title: meeting.title,
        duration_minutes: meeting.duration_minutes,
        timezone: meeting.timezone,
        created_at: meeting.created_at,
        windows,
      },
      valid_slots: validSlots,
      slot_counts: slotCounts,
      participants,
      participant_slots: participantSlots.filter((slot) => validSet.has(slot)),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get meeting error:", error);
    return new Response(JSON.stringify({ error: "회의 조회 중 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleSaveMeetingAvailability(request: Request, env: Env, meetingId: number): Promise<Response> {
  try {
    const body = await request.json() as {
      participant_name?: string;
      slots?: unknown;
    };
    const participantName = sanitizeParticipantName(body.participant_name || "");

    if (!participantName) {
      return new Response(JSON.stringify({ error: "이름을 입력해주세요." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(body.slots)) {
      return new Response(JSON.stringify({ error: "slots는 배열이어야 합니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const meeting = await env.DB.prepare(`
      SELECT id, duration_minutes, windows_json
      FROM meeting_polls
      WHERE id = ?
      LIMIT 1
    `).bind(meetingId).first<{ id: number; duration_minutes: number; windows_json: string }>();

    if (!meeting) {
      return new Response(JSON.stringify({ error: "회의를 찾을 수 없습니다." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validSlots = new Set(buildValidSlotKeys(parseWindowsJson(meeting.windows_json), meeting.duration_minutes));
    const sanitizedSlots = Array.from(new Set(
      body.slots
        .map((slot) => String(slot))
        .filter((slot) => /^([1-7])-(\d{2})$/.test(slot))
        .filter((slot) => validSlots.has(slot))
    ));

    await env.DB.prepare(`
      DELETE FROM meeting_availability
      WHERE meeting_id = ? AND participant_name = ?
    `).bind(meetingId, participantName).run();

    for (const slot of sanitizedSlots) {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO meeting_availability (meeting_id, participant_name, slot_key)
        VALUES (?, ?, ?)
      `).bind(meetingId, participantName, slot).run();
    }

    return new Response(JSON.stringify({
      success: true,
      saved_count: sanitizedSlots.length,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Save meeting availability error:", error);
    return new Response(JSON.stringify({ error: "가능 시간 저장 중 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function showTicketBoard(env: Env): Promise<Response> {
  try {
    // Get all work tickets
    const ticketsStmt = env.DB.prepare(`
      SELECT 
        id,
        ticket_title,
        ticket_description,
        status,
        user_name,
        assignee_id,
        assignee_name,
        parent_ticket_id,
        sort_order,
        created_at,
        started_at,
        completed_at
      FROM work_tickets 
      ORDER BY 
        sort_order ASC,
        created_at DESC
    `);
    const { results: ticketsResults } = await ticketsStmt.all();
    const tickets = (ticketsResults || []) as unknown as TicketItem[];

    // Get all users (from users table and work_tickets)
    // We want all users in the user table, PLUS anyone who is currently an assignee
    const usersStmt = env.DB.prepare(`
      SELECT user_id, user_name, display_name FROM (
        SELECT user_id, user_name, display_name FROM users WHERE is_active = 1
        UNION
        SELECT assignee_id as user_id, assignee_name as user_name, assignee_name as display_name 
        FROM work_tickets 
        WHERE assignee_id IS NOT NULL
      )
      GROUP BY user_id
      ORDER BY user_name
    `);
    const { results: usersResults } = await usersStmt.all();
    const users = (usersResults || []) as unknown as UserItem[];

    return new Response(renderTicketBoardPage(tickets, users), {
      headers: { "content-type": "text/html" },
    });
  } catch (error) {
    console.error("Database error:", error);
    return new Response("Database error: " + error, { status: 500 });
  }
}

async function showAttendanceStats(env: Env): Promise<Response> {
  try {
    // Get recent attendance records
    const stmt = env.DB.prepare(`
      SELECT user_name, type, datetime(timestamp, 'localtime') as time
      FROM attendance 
      ORDER BY timestamp DESC 
      LIMIT 20
    `);
    const { results } = await stmt.all();

    return new Response(renderHtml(JSON.stringify(results, null, 2)), {
      headers: {
        "content-type": "text/html",
      },
    });
  } catch (error) {
    return new Response("Database error: " + error, { status: 500 });
  }
}

async function handleStatsPage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Check authentication
  if (!isAuthenticated(request)) {
    const errorMessage = url.searchParams.get('error') || undefined;
    return new Response(renderLoginPage({
      errorMessage,
      googleLoginEnabled: isGoogleLoginEnabled(env),
    }), {
      headers: { "content-type": "text/html" },
    });
  }

  try {
    // Get week parameter from query string
    const weekParam = url.searchParams.get('week');

    const targetDate = weekParam ? new Date(weekParam) : new Date();
    const weekStart = getWeekStart(targetDate);
    const weekDates = getWeekDates(weekStart);

    // Fetch attendance records for the week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Format dates as YYYY-MM-DD for comparison
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const stmt = env.DB.prepare(`
      SELECT user_id, user_name, type, timestamp
      FROM attendance 
      WHERE date(timestamp) >= ? AND date(timestamp) < ?
      ORDER BY timestamp ASC
    `);

    const { results } = await stmt
      .bind(weekStartStr, weekEndStr)
      .all();

    // Fetch work logs for the week
    const workLogsStmt = env.DB.prepare(`
      SELECT user_id, log_content, timestamp
      FROM work_logs 
      WHERE date(timestamp) >= ? AND date(timestamp) < ?
      ORDER BY timestamp ASC
    `);

    const { results: workLogsResults } = await workLogsStmt
      .bind(weekStartStr, weekEndStr)
      .all();

    // Debug: Log query results
    console.log('Week range:', weekStartStr, 'to', weekEndStr);
    console.log('Attendance records:', results?.length || 0);
    console.log('Work logs:', workLogsResults?.length || 0);
    if (results && results.length > 0) {
      console.log('Sample record:', JSON.stringify(results[0]));
    }

    // Process weekly stats
    const userStatsMap = processWeeklyStats(results as unknown as AttendanceRecord[], weekDates);

    // Add work logs to user stats
    if (workLogsResults) {
      (workLogsResults as any[]).forEach((log: any) => {
        let userStats = userStatsMap.get(log.user_id);

        // If user not in map, create entry
        if (!userStats) {
          const days: { [key: string]: any } = {};
          weekDates.forEach(date => {
            days[date] = { checkIn: null, checkOut: null, workHours: null, workLogs: [] };
          });
          userStats = {
            userId: log.user_id,
            userName: log.user_id, // Will be updated with actual name
            days
          };
          userStatsMap.set(log.user_id, userStats);
        }

        // Extract date using Korea timezone
        const logDate = getKoreaDateString(log.timestamp);
        if (userStats.days[logDate]) {
          userStats.days[logDate].workLogs.push({
            log_content: log.log_content,
            timestamp: log.timestamp
          });
        }
      });
    }

    return new Response(
      renderWeeklyStatsPage(userStatsMap, weekDates, weekStart.toISOString().split('T')[0]),
      {
        headers: { "content-type": "text/html" },
      }
    );
  } catch (error) {
    console.error("Stats error:", error);
    return new Response("Error loading stats: " + error, { status: 500 });
  }
}

async function handleGoogleLoginStart(request: Request, env: Env): Promise<Response> {
  if (!isGoogleLoginEnabled(env)) {
    return new Response('', {
      status: 302,
      headers: { Location: '/stats?error=Google%20login%20is%20not%20configured' },
    });
  }

  const state = createGoogleOauthState();
  const redirectUri = getGoogleRedirectUri(request, env);
  const clientId = getOptionalEnvVar(env, 'GOOGLE_CLIENT_ID');
  if (!clientId) {
    return new Response('', {
      status: 302,
      headers: { Location: '/stats?error=Google%20client%20id%20is%20missing' },
    });
  }
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString();

  return new Response('', {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      'Set-Cookie': createGoogleOauthStateCookie(state),
    },
  });
}

async function handleGoogleLoginCallback(request: Request, env: Env): Promise<Response> {
  if (!isGoogleLoginEnabled(env)) {
    return new Response('', {
      status: 302,
      headers: { Location: '/stats?error=Google%20login%20is%20not%20configured' },
    });
  }

  const url = new URL(request.url);
  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    return new Response('', {
      status: 302,
      headers: { Location: `/stats?error=${encodeURIComponent(`Google login failed: ${oauthError}`)}` },
    });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !isValidGoogleOauthState(request, state)) {
    const headers = new Headers();
    headers.set('Location', '/stats?error=Invalid%20Google%20login%20state');
    headers.append('Set-Cookie', clearGoogleOauthStateCookie());
    return new Response('', {
      status: 302,
      headers,
    });
  }

  const redirectUri = getGoogleRedirectUri(request, env);
  const clientId = getOptionalEnvVar(env, 'GOOGLE_CLIENT_ID');
  const clientSecret = getOptionalEnvVar(env, 'GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return new Response('', {
      status: 302,
      headers: { Location: '/stats?error=Google%20login%20is%20not%20configured' },
    });
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Google token exchange failed:', tokenResponse.status, tokenError);
      return new Response('', {
        status: 302,
        headers: { Location: '/stats?error=Google%20token%20exchange%20failed' },
      });
    }

    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) {
      return new Response('', {
        status: 302,
        headers: { Location: '/stats?error=Google%20access%20token%20missing' },
      });
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      const userInfoError = await userInfoResponse.text();
      console.error('Google userinfo failed:', userInfoResponse.status, userInfoError);
      return new Response('', {
        status: 302,
        headers: { Location: '/stats?error=Google%20profile%20lookup%20failed' },
      });
    }

    const userInfo = await userInfoResponse.json() as { email?: string; verified_email?: boolean };

    if (!userInfo.email || userInfo.verified_email !== true) {
      return new Response('', {
        status: 302,
        headers: { Location: '/stats?error=Google%20account%20email%20is%20not%20verified' },
      });
    }

    if (!isEmailAllowedByDomain(userInfo.email, env)) {
      return new Response('', {
        status: 302,
        headers: { Location: '/stats?error=This%20Google%20account%20is%20not%20allowed' },
      });
    }

    const sessionToken = generateSessionToken();
    sessions.add(sessionToken);
    const headers = new Headers();
    headers.set('Location', '/stats');
    headers.append('Set-Cookie', createSessionCookie(sessionToken));
    headers.append('Set-Cookie', clearGoogleOauthStateCookie());

    return new Response('', {
      status: 302,
      headers,
    });
  } catch (error) {
    console.error('Google login callback error:', error);
    const headers = new Headers();
    headers.set('Location', '/stats?error=Unexpected%20error%20during%20Google%20login');
    headers.append('Set-Cookie', clearGoogleOauthStateCookie());
    return new Response('', {
      status: 302,
      headers,
    });
  }
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const formData = await request.formData();
  const password = formData.get('password') as string;

  const adminPassword = env.ADMIN_PASSWORD || 'admin123';

  if (verifyPassword(password, adminPassword)) {
    const sessionToken = generateSessionToken();
    sessions.add(sessionToken);

    return new Response('', {
      status: 302,
      headers: {
        'Location': '/stats',
        'Set-Cookie': createSessionCookie(sessionToken),
      },
    });
  }

  return new Response(renderLoginPage({
    errorMessage: '비밀번호가 올바르지 않습니다.',
    googleLoginEnabled: isGoogleLoginEnabled(env),
  }), {
    headers: { "content-type": "text/html" },
    status: 401,
  });
}

async function handleLogout(request: Request): Promise<Response> {
  const cookieHeader = request.headers.get('Cookie');
  const sessionToken = getSessionFromCookie(cookieHeader);

  if (sessionToken) {
    sessions.delete(sessionToken);
  }

  return new Response('', {
    status: 302,
    headers: {
      'Location': '/stats',
      'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Favicon endpoint
    if (url.pathname === '/favicon.ico') {
      const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#000"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="700" fill="#fff">S</text></svg>`;
      return new Response(svgFavicon, {
        status: 200,
        headers: {
          'content-type': 'image/svg+xml; charset=utf-8',
          'cache-control': 'public, max-age=86400',
        },
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // Weekly stats (protected with login)
    if (url.pathname === '/stats') {
      return handleStatsPage(request, env);
    }

    // Login endpoint
    if (url.pathname === '/stats/login') {
      return handleLogin(request, env);
    }

    // Google login start
    if (url.pathname === '/stats/auth/google') {
      return handleGoogleLoginStart(request, env);
    }

    // Google login callback
    if (url.pathname === '/stats/auth/google/callback') {
      return handleGoogleLoginCallback(request, env);
    }

    // Logout endpoint
    if (url.pathname === '/stats/logout') {
      return handleLogout(request);
    }

    // Meeting planner home
    if (url.pathname === '/meetings' && request.method === 'GET') {
      return showMeetingsHome(request);
    }

    // Meeting planner detail
    if (url.pathname.startsWith('/meetings/') && request.method === 'GET') {
      const meetingId = parseInt(url.pathname.split('/')[2]);
      if (!isNaN(meetingId)) {
        return showMeetingDetail(meetingId);
      }
    }

    // Ticket board (no auth required)
    if (url.pathname === '/') {
      return showTicketBoard(env);
    }

    // API: List meetings
    if (url.pathname === '/api/meetings' && request.method === 'GET') {
      return handleListMeetings(env);
    }

    // API: Create meeting
    if (url.pathname === '/api/meetings' && request.method === 'POST') {
      return handleCreateMeeting(request, env);
    }

    // API: Generate meeting plan via AI (auth required)
    if (url.pathname === '/api/meetings/ai-plan' && request.method === 'POST') {
      return handleGenerateMeetingPlanByAi(request, env);
    }

    // API: Get meeting detail
    if (url.pathname.startsWith('/api/meetings/') && request.method === 'GET') {
      const meetingId = parseInt(url.pathname.split('/')[3]);
      if (!isNaN(meetingId)) {
        return handleGetMeeting(env, meetingId, url.searchParams.get('participant_name'));
      }
    }

    // API: Save participant availability
    if (url.pathname.startsWith('/api/meetings/') && url.pathname.endsWith('/availability') && request.method === 'PUT') {
      const meetingId = parseInt(url.pathname.split('/')[3]);
      if (!isNaN(meetingId)) {
        return handleSaveMeetingAvailability(request, env, meetingId);
      }
    }

    // API: Create ticket from web
    if (url.pathname === '/api/tickets' && request.method === 'POST') {
      return handleCreateTicketFromWeb(request, env);
    }

    // API: Update ticket status
    if (url.pathname.startsWith('/api/tickets/') && url.pathname.endsWith('/status') && request.method === 'PATCH') {
      const ticketId = parseInt(url.pathname.split('/')[3]);
      return handleUpdateTicketStatus(request, env, ticketId);
    }

    // API: Update ticket assignee
    if (url.pathname.startsWith('/api/tickets/') && url.pathname.endsWith('/assignee') && request.method === 'PATCH') {
      const ticketId = parseInt(url.pathname.split('/')[3]);
      return handleUpdateTicketAssignee(request, env, ticketId);
    }

    // API: Update ticket creator
    if (url.pathname.startsWith('/api/tickets/') && url.pathname.endsWith('/creator') && request.method === 'PATCH') {
      const ticketId = parseInt(url.pathname.split('/')[3]);
      return handleUpdateTicketCreator(request, env, ticketId);
    }

    // API: Update ticket date
    if (url.pathname.startsWith('/api/tickets/') && url.pathname.endsWith('/date') && request.method === 'PATCH') {
      const ticketId = parseInt(url.pathname.split('/')[3]);
      return handleUpdateTicketDate(request, env, ticketId);
    }

    // API: Update ticket description
    if (url.pathname.startsWith('/api/tickets/') && url.pathname.endsWith('/description') && request.method === 'PATCH') {
      const ticketId = parseInt(url.pathname.split('/')[3]);
      return handleUpdateTicketDescription(request, env, ticketId);
    }

    // API: Update ticket hierarchy
    if (url.pathname.startsWith('/api/tickets/') && url.pathname.endsWith('/hierarchy') && request.method === 'PATCH') {
      const ticketId = parseInt(url.pathname.split('/')[3]);
      return handleUpdateTicketHierarchy(request, env, ticketId);
    }

    // API: Delete ticket
    if (url.pathname.startsWith('/api/tickets/') && request.method === 'DELETE') {
      const ticketId = parseInt(url.pathname.split('/')[3]);
      if (!isNaN(ticketId)) {
        return handleDeleteTicket(request, env, ticketId);
      }
    }

    // Handle Slack slash commands
    if (url.pathname === '/slack/command' && request.method === 'POST') {
      if (!(await verifySlackRequest(request, env))) {
        return new Response('Unauthorized', { status: 401 });
      }

      const formData = await request.formData();
      const slackCommand: SlackCommand = {
        token: formData.get('token') as string,
        team_id: formData.get('team_id') as string,
        team_domain: formData.get('team_domain') as string,
        channel_id: formData.get('channel_id') as string,
        channel_name: formData.get('channel_name') as string,
        user_id: formData.get('user_id') as string,
        user_name: formData.get('user_name') as string,
        command: formData.get('command') as string,
        text: formData.get('text') as string,
        response_url: formData.get('response_url') as string,
        trigger_id: formData.get('trigger_id') as string,
      };

      return handleSlackCommand(slackCommand, env, ctx);
    }

    return new Response('Not Found', { status: 404 });
  },

  // Scheduled event handler (Cron Trigger)
  async scheduled(event, env, ctx) {
    console.log('Cron trigger fired at:', new Date(event.scheduledTime).toISOString());

    try {
      // Cron expressions are in UTC (per wrangler.json).
      if (event.cron === '0 0 * * 6') {
        await sendWeeklySummary(env);
        console.log('Weekly summary sent successfully');
        return;
      }

      // Daily 19:00 UTC == daily 04:00 KST: auto-close stale open "in" entries.
      if (event.cron === '0 19 * * *') {
        const nowUtcMs = event.scheduledTime;

        const openInsStmt = env.DB.prepare(`
          SELECT
            user_id,
            user_name,
            team_id,
            timestamp,
            CAST(strftime('%s', timestamp) AS INTEGER) AS ts
          FROM attendance a
          WHERE a.type = 'in'
            AND a.timestamp = (
              SELECT MAX(timestamp)
              FROM attendance
              WHERE user_id = a.user_id AND team_id = a.team_id
            )
        `);

        const { results } = await openInsStmt.all();
        const openIns = (results || []) as unknown as Array<{
          user_id: string;
          user_name: string;
          team_id: string;
          timestamp: string;
          ts: number;
        }>;

        let closedCount = 0;
        for (const row of openIns) {
          const inUtcMs = row.ts * 1000;
          const cutoffUtcMs = getNextKst4amUtcMsFromIn(inUtcMs);
          if (nowUtcMs < cutoffUtcMs) continue;

          const autoOutUtcMs = inUtcMs + AUTO_OUT_AFTER_HOURS_MS;
          await insertAutoOut(env, row.user_id, row.user_name, row.team_id, Math.floor(autoOutUtcMs / 1000));
          closedCount++;
        }

        console.log(`Auto-closed ${closedCount} stale open attendance sessions`);
        return;
      }

      console.log('Unknown cron schedule, ignoring:', event.cron);
    } catch (error) {
      console.error('Scheduled handler error:', error);
    }
  },
} satisfies ExportedHandler<Env>;
