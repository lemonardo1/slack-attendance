export function renderHtml(content: string) {
  return `
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>출퇴근 기록</title>
        <link rel="stylesheet" type="text/css" href="https://static.integrations.cloudflare.com/styles.css">
        <style>
          .attendance-record {
            background: #f5f5f5;
            padding: 12px;
            margin: 8px 0;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .attendance-in { border-left: 4px solid #4CAF50; }
          .attendance-out { border-left: 4px solid #FF9800; }
          .user-name { font-weight: bold; color: #333; }
          .time { color: #666; font-size: 0.9em; }
          .type-badge {
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: bold;
          }
          .badge-in { background: #4CAF50; color: white; }
          .badge-out { background: #FF9800; color: white; }
        </style>
      </head>
    
      <body>
        <header>
          <h1>👋 출퇴근 기록</h1>
        </header>
        <main>
          <p>최근 출퇴근 기록 (최대 20개):</p>
          <div id="records"></div>
        </main>
        <script>
          const data = ${content};
          const recordsDiv = document.getElementById('records');
          
          if (data && data.length > 0) {
            data.forEach(record => {
              const div = document.createElement('div');
              div.className = 'attendance-record attendance-' + record.type;
              div.innerHTML = \`
                <div>
                  <span class="user-name">\${record.user_name}</span>
                  <span class="time">\${record.time}</span>
                </div>
                <span class="type-badge badge-\${record.type}">
                  \${record.type === 'in' ? '출근' : '퇴근'}
                </span>
              \`;
              recordsDiv.appendChild(div);
            });
          } else {
            recordsDiv.innerHTML = '<p>아직 기록이 없습니다.</p>';
          }
        </script>
      </body>
    </html>
`;
}
