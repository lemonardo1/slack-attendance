import { renderHtml } from "./renderHtml";
import { verifySlackSignature } from "./slackVerify";

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

async function verifySlackRequest(request: Request, env: Env): Promise<boolean> {
  // Skip verification if SLACK_SIGNING_SECRET is not set (development mode)
  if (!env.SLACK_SIGNING_SECRET) {
    console.warn('SLACK_SIGNING_SECRET not set, skipping verification');
    return true;
  }

  return await verifySlackSignature(request, env.SLACK_SIGNING_SECRET);
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // View attendance stats
    if (url.pathname === '/' || url.pathname === '/stats') {
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
