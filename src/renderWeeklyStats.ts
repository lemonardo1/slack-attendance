import { UserWeekStats, getDayName, formatTime } from './weeklyStats';

export function renderLoginPage(errorMessage?: string): string {
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
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          h1 {
            font-size: 24px;
          }
          .week-selector {
            display: flex;
            gap: 10px;
            align-items: center;
          }
          .week-selector button {
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          }
          .week-selector button:hover {
            background: rgba(255,255,255,0.3);
          }
          .logout-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
          .table-container {
            overflow-x: auto;
            padding: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            background: #f8f9fa;
            padding: 15px 10px;
            text-align: left;
            font-weight: 600;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
            position: sticky;
            top: 0;
          }
          th.user-col {
            min-width: 120px;
            position: sticky;
            left: 0;
            background: #f8f9fa;
            z-index: 2;
          }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #dee2e6;
          }
          td.user-col {
            font-weight: 600;
            color: #212529;
            position: sticky;
            left: 0;
            background: white;
            z-index: 1;
          }
          .day-cell {
            min-width: 140px;
          }
          .time-in {
            color: #28a745;
            font-size: 13px;
            display: block;
          }
          .time-out {
            color: #dc3545;
            font-size: 13px;
            display: block;
          }
          .work-hours {
            color: #6c757d;
            font-size: 12px;
            font-weight: 600;
            margin-top: 4px;
            display: block;
          }
          .no-data {
            color: #adb5bd;
            font-size: 13px;
          }
          .day-header {
            text-align: center;
          }
          .day-name {
            font-size: 12px;
            color: #6c757d;
            display: block;
          }
          .day-date {
            font-size: 14px;
            color: #212529;
          }
          .weekend {
            background: #f8f9fa;
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
              gap: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <div>
              <h1>📊 주간 근태 현황</h1>
              <p style="margin-top: 8px; opacity: 0.9;">주 시작: ${weekStart}</p>
            </div>
            <div style="display: flex; gap: 10px;">
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
                      if (!day.checkIn && !day.checkOut) {
                        return `<td class="${isWeekend ? 'weekend' : ''}"><span class="no-data">-</span></td>`;
                      }
                      return `
                        <td class="day-cell ${isWeekend ? 'weekend' : ''}">
                          <span class="time-in">출근: ${formatTime(day.checkIn)}</span>
                          <span class="time-out">퇴근: ${formatTime(day.checkOut)}</span>
                          ${day.workHours !== null ? `<span class="work-hours">${day.workHours}시간</span>` : ''}
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

