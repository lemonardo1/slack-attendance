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

type LastAttendanceRecord = {
  type: 'in' | 'out';
  timestamp: string;
  ts: number; // epoch seconds (UTC)
  is_auto: number; // 0 or 1
};

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
    await env.DB.prepare(
      "INSERT INTO work_tickets (user_id, user_name, team_id, ticket_title, ticket_description, status) VALUES (?, ?, ?, ?, ?, 'pending')"
    ).bind(user_id, user_name, team_id, ticketTitle, ticketDescription).run();

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

async function handleCreateTicketFromWeb(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { description: string };

    if (!body.description || body.description.trim() === '') {
      return new Response(JSON.stringify({ error: '업무 내용을 입력해주세요' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const ticketDescription = body.description.trim();
    const lastTicket = await env.DB.prepare("SELECT id FROM work_tickets ORDER BY id DESC LIMIT 1").first();
    const nextId = (lastTicket ? (lastTicket.id as number) : 0) + 1;
    const ticketTitle = `FE-${String(nextId).padStart(3, '0')}`;
    const defaultTeamId = 'WEB';
    const defaultUserId = 'web-user';
    const defaultUserName = 'Web User';

    const result = await env.DB.prepare(
      "INSERT INTO work_tickets (user_id, user_name, team_id, ticket_title, ticket_description, status) VALUES (?, ?, ?, ?, ?, 'pending')"
    ).bind(defaultUserId, defaultUserName, defaultTeamId, ticketTitle, ticketDescription).run();

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
    await env.DB.prepare("DELETE FROM work_tickets WHERE id = ?").bind(ticketId).run();
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Delete ticket error:", error);
    return new Response(JSON.stringify({ error: '티켓 삭제 중 오류가 발생했습니다' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
        created_at,
        started_at,
        completed_at
      FROM work_tickets 
      ORDER BY 
        CASE status
          WHEN 'in_progress' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'completed' THEN 3
        END,
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
  // Check authentication
  if (!isAuthenticated(request)) {
    return new Response(renderLoginPage(), {
      headers: { "content-type": "text/html" },
    });
  }

  try {
    // Get week parameter from query string
    const url = new URL(request.url);
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

  return new Response(renderLoginPage('비밀번호가 올바르지 않습니다.'), {
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

    // Logout endpoint
    if (url.pathname === '/stats/logout') {
      return handleLogout(request);
    }

    // Ticket board (no auth required)
    if (url.pathname === '/') {
      return showTicketBoard(env);
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

    // API: Delete ticket
    if (url.pathname.startsWith('/api/tickets/') && request.method === 'DELETE') {
      const ticketId = parseInt(url.pathname.split('/')[2]);
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
