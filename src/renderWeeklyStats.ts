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
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .login-container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
          }
          h1 {
            color: #333;
            margin-bottom: 30px;
            text-align: center;
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
          }
          input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s;
          }
          input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
          }
          button {
            width: 100%;
            padding: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
          }
          button:hover {
            background: #5568d3;
          }
          .google-btn {
            display: block;
            width: 100%;
            padding: 12px;
            margin-bottom: 12px;
            background: #fff;
            color: #222;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 15px;
            font-weight: 600;
            text-align: center;
            text-decoration: none;
          }
          .google-btn:hover {
            background: #f6f6f6;
          }
          .divider {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 12px 0 16px;
            color: #999;
            font-size: 12px;
          }
          .divider::before,
          .divider::after {
            content: '';
            height: 1px;
            background: #eee;
            flex: 1;
          }
          .error {
            color: #e74c3c;
            background: #fee;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="login-container">
          <h1>🔒 관리자 로그인</h1>
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
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            padding: 20px;
          }
          .container {
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          h1 {
            font-size: 22px;
          }
          .week-selector {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .week-selector button {
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
          }
          .week-selector button:hover {
            background: rgba(255,255,255,0.3);
          }
          .logout-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-size: 13px;
          }
          .table-container {
            overflow-x: auto;
            padding: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th {
            background: #f8f9fa;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
            position: sticky;
            top: 0;
          }
          th.user-col {
            min-width: 90px;
            position: sticky;
            left: 0;
            background: #f8f9fa;
            z-index: 2;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: top;
          }
          td.user-col {
            font-weight: 600;
            color: #212529;
            position: sticky;
            left: 0;
            background: white;
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
            color: #28a745;
          }
          .time-out {
            color: #dc3545;
          }
          .work-hours {
            color: #6c757d;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .work-logs {
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px dashed #dee2e6;
          }
          .work-log-item {
            background: #f8f9fa;
            padding: 4px 6px;
            margin-bottom: 4px;
            border-radius: 4px;
            font-size: 11px;
            color: #495057;
            line-height: 1.4;
            display: flex;
            align-items: flex-start;
            gap: 4px;
          }
          .work-log-time {
            color: #6c757d;
            font-size: 10px;
            flex-shrink: 0;
          }
          .work-log-content {
            flex: 1;
            word-break: break-word;
          }
          .no-data {
            color: #adb5bd;
            font-size: 12px;
          }
          .day-header {
            text-align: center;
          }
          .day-name {
            font-size: 11px;
            color: #6c757d;
            display: block;
          }
          .day-date {
            font-size: 12px;
            color: #212529;
          }
          .weekend {
            background: #fafbfc;
          }
          .log-icon {
            color: #667eea;
            font-weight: bold;
          }
          @media (max-width: 768px) {
            body {
              padding: 0;
            }
            .container {
              border-radius: 0;
            }
            header {
              flex-direction: column;
              gap: 10px;
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
              <h1>📊 주간 근태 현황</h1>
              <p style="margin-top: 6px; opacity: 0.9; font-size: 13px;">주 시작: ${weekStart}</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <div class="week-selector">
                <button onclick="changeWeek(-1)">← 이전 주</button>
                <button onclick="changeWeek(0)">이번 주</button>
                <button onclick="changeWeek(1)">다음 주 →</button>
              </div>
              <a href="/stats/logout" class="logout-btn">로그아웃</a>
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
                    <td colspan="${weekDates.length + 1}" style="text-align: center; padding: 40px; color: #6c757d;">
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
