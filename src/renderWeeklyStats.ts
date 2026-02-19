import { UserWeekStats, getDayName, formatTime } from './weeklyStats';
import {
  floatingAuthButtonStyles,
  renderBackToBoardLink,
  renderFloatingAuthButton,
  sharedPageHeaderStyles
} from './sharedPageHeader';

type LoginPageOptions = {
  errorMessage?: string;
  googleLoginEnabled?: boolean;
};

function isWeekendIndex(index: number): boolean {
  return index === 0 || index === 6;
}

function countAttendanceEntries(userStats: UserWeekStats[], weekDates: string[]): number {
  return userStats.reduce((count, user) => {
    return count + weekDates.reduce((dayCount, date) => {
      const day = user.days[date];
      if (!day) return dayCount;
      return dayCount + (day.checkIn || day.checkOut ? 1 : 0);
    }, 0);
  }, 0);
}

function countWorkLogs(userStats: UserWeekStats[], weekDates: string[]): number {
  return userStats.reduce((count, user) => {
    return count + weekDates.reduce((dayCount, date) => {
      const day = user.days[date];
      return dayCount + (day?.workLogs?.length || 0);
    }, 0);
  }, 0);
}

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
          * { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }
          :root {
            --bg-color: #000000;
            --panel: #111111;
            --border-color: #222222;
            --text-primary: #ffffff;
            --text-secondary: #666666;
          }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg-color);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 40px 20px;
          }
          .container {
            max-width: 980px;
            margin: 0 auto;
          }
          ${sharedPageHeaderStyles}
          ${floatingAuthButtonStyles}
          header {
            margin-bottom: 28px;
            padding-bottom: 14px;
            border-bottom: 1px solid var(--border-color);
          }
          .header-title {
            font-size: 28px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: -0.02em;
          }
          .header-subtitle {
            margin-top: 6px;
            color: var(--text-secondary);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .login-wrap {
            max-width: 430px;
            margin: 0 auto;
            background: var(--panel);
            border: 1px solid var(--border-color);
            padding: 28px;
          }
          .panel-title {
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-bottom: 6px;
          }
          .panel-subtitle {
            color: var(--text-secondary);
            font-size: 12px;
            margin-bottom: 20px;
          }
          .form-group {
            margin-bottom: 16px;
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
            border-color: var(--text-primary);
          }
          .action-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 10px 12px;
            background: #0b0b0b;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            cursor: pointer;
            text-decoration: none;
          }
          .action-btn:hover {
            border-color: var(--text-primary);
          }
          .google-btn {
            margin-bottom: 12px;
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
            color: #ff9f9f;
            border: 1px solid #6c2b2b;
            background: #1a0d0d;
            padding: 10px;
            margin-bottom: 16px;
            font-size: 12px;
          }
          .back-link {
            margin-top: 14px;
            color: var(--text-secondary);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            text-decoration: none;
            display: inline-block;
          }
          .back-link:hover {
            color: var(--text-primary);
          }
          @media (max-width: 768px) {
            body { padding: 20px 14px; }
            .header-title { font-size: 22px; }
            .login-wrap { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${renderBackToBoardLink()}
          <header>
            <h1 class="header-title">Weekly Stats</h1>
            <p class="header-subtitle">attendance dashboard access</p>
          </header>
          <section class="login-wrap">
            <h2 class="panel-title">관리자 로그인</h2>
            <p class="panel-subtitle">Google 또는 비밀번호로 계속하세요.</p>
            ${errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : ''}
            ${googleLoginEnabled ? `
              <a class="action-btn google-btn" href="/stats/auth/google">Google 로그인</a>
              <div class="divider">또는 비밀번호 로그인</div>
            ` : ''}
            <form method="POST" action="/stats/login">
              <div class="form-group">
                <label for="password">비밀번호</label>
                <input type="password" id="password" name="password" required autofocus />
              </div>
              <button type="submit" class="action-btn">로그인</button>
            </form>
            <a class="back-link" href="/">Board로 이동</a>
          </section>
        </div>
        ${renderFloatingAuthButton()}
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
  const memberCount = userStats.length;
  const attendanceCount = countAttendanceEntries(userStats, weekDates);
  const workLogCount = countWorkLogs(userStats, weekDates);

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
          * { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }
          :root {
            --bg-color: #000000;
            --panel: #111111;
            --border-color: #222222;
            --text-primary: #ffffff;
            --text-secondary: #666666;
            --in-color: #8dd6a3;
            --out-color: #ef8f8f;
            --log-color: #9ab8ff;
          }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg-color);
            color: var(--text-primary);
            padding: 40px;
          }
          .container {
            max-width: 1680px;
            margin: 0 auto;
          }
          ${sharedPageHeaderStyles}
          ${floatingAuthButtonStyles}
          .action-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #0b0b0b;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: 9px 12px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            text-decoration: none;
          }
          .action-btn:hover {
            border-color: var(--text-primary);
          }
          .logout-btn {
            border-color: #6c2b2b;
            color: #ff9f9f;
          }
          .logout-btn:hover {
            border-color: #ff9f9f;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 14px;
          }
          .summary-item {
            background: var(--panel);
            border: 1px solid var(--border-color);
            padding: 14px;
          }
          .summary-label {
            color: var(--text-secondary);
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .summary-value {
            margin-top: 8px;
            font-size: 24px;
            font-weight: 700;
            line-height: 1;
          }
          .legend {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 12px;
            color: var(--text-secondary);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .legend b {
            color: var(--text-primary);
            font-weight: 700;
          }
          .table-container {
            overflow-x: auto;
            border: 1px solid var(--border-color);
            background: var(--panel);
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
            z-index: 3;
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
            z-index: 2;
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
          .work-log-label {
            color: var(--log-color);
            font-weight: 700;
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
          @media (max-width: 768px) {
            body {
              padding: 16px;
            }
            .summary-grid {
              grid-template-columns: 1fr;
            }
            .day-cell {
              min-width: 140px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${renderBackToBoardLink()}
          <header class="page-header">
            <div>
              <h1 class="page-title">Weekly Stats</h1>
              <p class="page-subtitle">Week start ${escapeHtml(weekStart)} · attendance and work logs</p>
            </div>
            <div class="page-header-actions">
              <a href="/meetings" class="action-btn">Meetings</a>
              <button class="action-btn" onclick="changeWeek(-1)">Prev Week</button>
              <button class="action-btn" onclick="changeWeek(0)">This Week</button>
              <button class="action-btn" onclick="changeWeek(1)">Next Week</button>
              <a href="/stats/logout" class="action-btn logout-btn">Logout</a>
            </div>
          </header>
          <section class="summary-grid">
            <article class="summary-item">
              <p class="summary-label">Members</p>
              <p class="summary-value">${memberCount}</p>
            </article>
            <article class="summary-item">
              <p class="summary-label">Attendance Entries</p>
              <p class="summary-value">${attendanceCount}</p>
            </article>
            <article class="summary-item">
              <p class="summary-label">Work Logs</p>
              <p class="summary-value">${workLogCount}</p>
            </article>
          </section>
          <div class="legend">
            <span><b>IN</b> check-in time</span>
            <span><b>OUT</b> check-out time</span>
            <span><b>HOURS</b> calculated work duration</span>
            <span><b>LOG</b> work note entries</span>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th class="user-col">이름</th>
                  ${weekDates.map((date, idx) => {
                    const dayName = getDayName(date);
                    const isWeekend = isWeekendIndex(idx);
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
                    <td class="user-col">${escapeHtml(user.userName)}</td>
                    ${weekDates.map((date, idx) => {
                      const day = user.days[date];
                      const isWeekend = isWeekendIndex(idx);
                      
                      const hasAttendance = day.checkIn || day.checkOut;
                      const hasLogs = day.workLogs && day.workLogs.length > 0;
                      
                      if (!hasAttendance && !hasLogs) {
                        return `<td class="${isWeekend ? 'weekend' : ''}"><span class="no-data">-</span></td>`;
                      }
                      
                      return `
                        <td class="day-cell ${isWeekend ? 'weekend' : ''}">
                          ${hasAttendance ? `
                            <div class="time-info">
                              <span class="time-in">IN ${formatTime(day.checkIn)}</span>
                              <span class="time-out">OUT ${formatTime(day.checkOut)}</span>
                            </div>
                            ${day.workHours !== null ? `<div class="work-hours">HOURS ${day.workHours}</div>` : ''}
                          ` : ''}
                          
                          ${hasLogs ? `
                            <div class="work-logs">
                              ${day.workLogs.map(log => `
                                <div class="work-log-item">
                                  <span class="work-log-label">LOG</span>
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
          function parseWeekDate(week) {
            const parts = week.split('-').map(Number);
            if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
            return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12));
          }

          function formatWeekDate(date) {
            return date.toISOString().slice(0, 10);
          }

          function changeWeek(offset) {
            const params = new URLSearchParams(window.location.search);
            const currentWeek = params.get('week') || '${weekStart}';
            const date = parseWeekDate(currentWeek);
            if (!date) {
              params.delete('week');
              window.location.search = params.toString();
              return;
            }
            
            if (offset === 0) {
              // This week
              params.delete('week');
            } else {
              date.setUTCDate(date.getUTCDate() + (offset * 7));
              params.set('week', formatWeekDate(date));
            }
            
            window.location.search = params.toString();
          }
        </script>
        ${renderFloatingAuthButton()}
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
