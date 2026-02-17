import { UserWeekStats, getDayName, formatTime } from './weeklyStats';

type LoginPageOptions = {
  errorMessage?: string;
  googleLoginEnabled?: boolean;
};

export function renderLoginPage(options?: LoginPageOptions): string {
  const errorMessage = options?.errorMessage;
  const googleLoginEnabled = options?.googleLoginEnabled ?? false;
  return `
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>관리자 로그인</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          :root {
            --bg-color: #000000;
            --card-bg: #111111;
            --border-color: #222222;
            --text-primary: #ffffff;
            --text-secondary: #666666;
            --accent: #ffffff;
            --danger: #ff4d4f;
          }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg-color);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .login-container {
            background: var(--card-bg);
            padding: 40px;
            border: 1px solid var(--border-color);
            width: 100%;
            max-width: 400px;
          }
          h1 {
            color: var(--text-primary);
            margin-bottom: 30px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-size: 22px;
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            margin-bottom: 8px;
            color: var(--text-secondary);
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--border-color);
            background: #0b0b0b;
            color: var(--text-primary);
            font-size: 14px;
          }
          input[type="password"]:focus {
            outline: none;
            border-color: var(--accent);
          }
          button {
            width: 100%;
            padding: 12px;
            background: var(--accent);
            color: var(--bg-color);
            border: 1px solid var(--accent);
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            cursor: pointer;
          }
          button:hover {
            opacity: 0.85;
          }
          .google-btn {
            display: block;
            width: 100%;
            padding: 12px;
            margin-bottom: 12px;
            background: #0b0b0b;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            text-align: center;
            text-decoration: none;
          }
          .google-btn:hover {
            border-color: var(--accent);
          }
          .divider {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 12px 0 16px;
            color: var(--text-secondary);
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .divider::before,
          .divider::after {
            content: '';
            height: 1px;
            background: var(--border-color);
            flex: 1;
          }
          .error {
            color: var(--danger);
            border: 1px solid var(--danger);
            background: rgba(255, 77, 79, 0.08);
            padding: 10px;
            margin-bottom: 20px;
            text-align: center;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="login-container">
          <h1>Stats Login</h1>
          ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
          ${googleLoginEnabled ? `
            <a class="google-btn" href="/stats/auth/google">Google로 로그인</a>
            <div class="divider">또는 비밀번호로 로그인</div>
          ` : ''}
          <form method="POST" action="/stats/login">
            <div class="form-group">
              <label for="password">비밀번호</label>
              <input type="password" id="password" name="password" required autofocus />
            </div>
            <button type="submit">로그인</button>
          </form>
        </div>
      </body>
    </html>
  `;
}

export function renderWeeklyStatsPage(
  userStatsMap: Map<string, UserWeekStats>,
  weekDates: string[],
  weekStart: string
): string {
  const userStats = Array.from(userStatsMap.values()).sort((a, b) => 
    a.userName.localeCompare(b.userName)
  );

  return `
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>주간 근태 현황</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          :root {
            --bg-color: #000000;
            --card-bg: #111111;
            --border-color: #222222;
            --text-primary: #ffffff;
            --text-secondary: #666666;
            --accent: #ffffff;
            --in-color: #8dd6a3;
            --out-color: #ef8f8f;
            --log-color: #8db5ff;
          }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg-color);
            color: var(--text-primary);
            padding: 40px;
          }
          .container {
            max-width: 1800px;
            margin: 0 auto;
            background: var(--bg-color);
          }
          header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid var(--accent);
          }
          h1 {
            font-size: 28px;
            text-transform: uppercase;
            letter-spacing: -0.02em;
          }
          .header-sub {
            margin-top: 6px;
            color: var(--text-secondary);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .header-actions {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .action-btn {
            background: #0b0b0b;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .action-btn:hover {
            border-color: var(--accent);
          }
          .logout-btn {
            border-color: #6c2b2b;
            color: #ff9f9f;
          }
          .logout-btn:hover {
            border-color: #ff9f9f;
          }
          .table-container {
            overflow-x: auto;
            border: 2px solid var(--border-color);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th {
            background: #0b0b0b;
            padding: 10px 8px;
            text-align: left;
            font-weight: 700;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            border-bottom: 1px solid var(--border-color);
            border-right: 1px solid var(--border-color);
            position: sticky;
            top: 0;
          }
          th.user-col {
            min-width: 120px;
            position: sticky;
            left: 0;
            background: #0b0b0b;
            z-index: 2;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid var(--border-color);
            border-right: 1px solid var(--border-color);
            vertical-align: top;
            background: var(--bg-color);
          }
          td.user-col {
            font-weight: 700;
            color: var(--text-primary);
            position: sticky;
            left: 0;
            background: #0b0b0b;
            z-index: 1;
            font-size: 13px;
          }
          .day-cell {
            min-width: 160px;
            max-width: 180px;
          }
          .time-info {
            display: flex;
            gap: 8px;
            margin-bottom: 6px;
            font-size: 11px;
          }
          .time-in {
            color: var(--in-color);
          }
          .time-out {
            color: var(--out-color);
          }
          .work-hours {
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .work-logs {
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px dashed var(--border-color);
          }
          .work-log-item {
            background: #0b0b0b;
            border: 1px solid var(--border-color);
            padding: 4px 6px;
            margin-bottom: 4px;
            font-size: 11px;
            color: var(--text-primary);
            line-height: 1.4;
            display: flex;
            align-items: flex-start;
            gap: 4px;
          }
          .work-log-time {
            color: var(--text-secondary);
            font-size: 10px;
            flex-shrink: 0;
          }
          .work-log-content {
            flex: 1;
            word-break: break-word;
          }
          .no-data {
            color: var(--text-secondary);
            font-size: 12px;
          }
          .day-header {
            text-align: center;
          }
          .day-name {
            font-size: 11px;
            color: var(--text-secondary);
            display: block;
          }
          .day-date {
            font-size: 12px;
            color: var(--text-primary);
          }
          .weekend {
            background: #070707;
          }
          .log-icon {
            color: var(--log-color);
            font-weight: bold;
          }
          @media (max-width: 768px) {
            body {
              padding: 16px;
            }
            header {
              flex-direction: column;
              gap: 10px;
              align-items: flex-start;
            }
            .day-cell {
              min-width: 140px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <div>
              <h1>Weekly Stats</h1>
              <p class="header-sub">Week Start: ${weekStart}</p>
            </div>
            <div class="header-actions">
              <a href="/" class="action-btn">Board</a>
              <a href="/meetings" class="action-btn">Meetings</a>
              <button class="action-btn" onclick="changeWeek(-1)">Prev Week</button>
              <button class="action-btn" onclick="changeWeek(0)">This Week</button>
              <button class="action-btn" onclick="changeWeek(1)">Next Week</button>
              <a href="/stats/logout" class="action-btn logout-btn">Logout</a>
            </div>
          </header>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th class="user-col">이름</th>
                  ${weekDates.map((date, idx) => {
                    const dayName = getDayName(date);
                    const isWeekend = idx === 0 || idx === 6;
                    return `
                      <th class="day-header ${isWeekend ? 'weekend' : ''}">
                        <span class="day-name">${dayName}</span>
                        <span class="day-date">${date.substring(5)}</span>
                      </th>
                    `;
                  }).join('')}
                </tr>
              </thead>
              <tbody>
                ${userStats.length === 0 ? `
                  <tr>
                    <td colspan="${weekDates.length + 1}" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                      이번 주 출퇴근 기록이 없습니다.
                    </td>
                  </tr>
                ` : userStats.map(user => `
                  <tr>
                    <td class="user-col">${user.userName}</td>
                    ${weekDates.map((date, idx) => {
                      const day = user.days[date];
                      const isWeekend = idx === 0 || idx === 6;
                      
                      const hasAttendance = day.checkIn || day.checkOut;
                      const hasLogs = day.workLogs && day.workLogs.length > 0;
                      
                      if (!hasAttendance && !hasLogs) {
                        return `<td class="${isWeekend ? 'weekend' : ''}"><span class="no-data">-</span></td>`;
                      }
                      
                      return `
                        <td class="day-cell ${isWeekend ? 'weekend' : ''}">
                          ${hasAttendance ? `
                            <div class="time-info">
                              <span class="time-in">🔵 ${formatTime(day.checkIn)}</span>
                              <span class="time-out">🔴 ${formatTime(day.checkOut)}</span>
                            </div>
                            ${day.workHours !== null ? `<div class="work-hours">⏱️ ${day.workHours}시간</div>` : ''}
                          ` : ''}
                          
                          ${hasLogs ? `
                            <div class="work-logs">
                              ${day.workLogs.map(log => `
                                <div class="work-log-item">
                                  <span class="log-icon">📝</span>
                                  <div class="work-log-content">
                                    ${escapeHtml(log.log_content)}
                                    <div class="work-log-time">${formatTime(log.timestamp)}</div>
                                  </div>
                                </div>
                              `).join('')}
                            </div>
                          ` : ''}
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <script>
          function changeWeek(offset) {
            const params = new URLSearchParams(window.location.search);
            const currentWeek = params.get('week') || '${weekStart}';
            const date = new Date(currentWeek);
            
            if (offset === 0) {
              // This week
              params.delete('week');
            } else {
              date.setDate(date.getDate() + (offset * 7));
              params.set('week', date.toISOString().split('T')[0]);
            }
            
            window.location.search = params.toString();
          }
        </script>
      </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
