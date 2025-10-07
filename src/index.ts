import { renderHtml } from "./renderHtml";
import { verifySlackSignature } from "./slackVerify";
import { generateSessionToken, createSessionCookie, getSessionFromCookie, verifyPassword } from "./auth";
import { 
  getWeekStart, 
  getWeekDates, 
  processWeeklyStats, 
  AttendanceRecord 
} from "./weeklyStats";
import { renderLoginPage, renderWeeklyStatsPage } from "./renderWeeklyStats";

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

async function handleSlackCommand(command: SlackCommand, env: Env): Promise<Response> {
  const { user_id, user_name, team_id, command: cmd, text } = command;

  // Parse command
  const type = cmd === '/in' ? 'in' : cmd === '/out' ? 'out' : null;

  if (!type) {
    return new Response(
      JSON.stringify({
        response_type: "ephemeral",
        text: "❌ 알 수 없는 커맨드입니다. `/in` 또는 `/out`을 사용해주세요.",
      }),
      {
        headers: { "content-type": "application/json" },
      }
    );
  }

  try {
    // Insert attendance record
    await env.DB.prepare(
      "INSERT INTO attendance (user_id, user_name, team_id, type) VALUES (?, ?, ?, ?)"
    )
      .bind(user_id, user_name, team_id, type)
      .run();

    const emoji = type === 'in' ? '👋' : '🏃';
    const message = type === 'in' ? '출근' : '퇴근';
    const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    return new Response(
      JSON.stringify({
        response_type: "in_channel",
        text: `${emoji} <@${user_id}>님이 ${message} 체크했습니다! (${koreanTime})`,
      }),
      {
        headers: { "content-type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Database error:", error);
    return new Response(
      JSON.stringify({
        response_type: "ephemeral",
        text: "❌ 출퇴근 체크 중 오류가 발생했습니다.",
      }),
      {
        headers: { "content-type": "application/json" },
      }
    );
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

    const stmt = env.DB.prepare(`
      SELECT user_id, user_name, type, timestamp
      FROM attendance 
      WHERE date(timestamp) >= date(?) AND date(timestamp) < date(?)
      ORDER BY timestamp ASC
    `);
    
    const { results } = await stmt
      .bind(weekStart.toISOString(), weekEnd.toISOString())
      .all();

    // Process weekly stats
    const userStatsMap = processWeeklyStats(results as unknown as AttendanceRecord[], weekDates);

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
  async fetch(request, env) {
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

    // Simple recent records view (no auth required)
    if (url.pathname === '/') {
      return showAttendanceStats(env);
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

      return handleSlackCommand(slackCommand, env);
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
