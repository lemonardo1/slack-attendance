import {
  floatingAuthButtonStyles,
  renderBackToBoardLink,
  renderFloatingAuthButton,
  sharedPageHeaderStyles
} from './sharedPageHeader';

type MeetingWindow = {
  day: number; // 1=Mon ... 7=Sun
  startHour: number;
  endHour: number;
};

export function renderMeetingHomePage(isAiScheduleEnabled: boolean): string {
  return `
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>회의 시간 조율</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg: #000000;
        --panel: #111111;
        --text: #ffffff;
        --sub: #666666;
        --line: #222222;
        --accent: #ffffff;
        --accent-2: #dddddd;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: var(--bg);
        color: var(--text);
        min-height: 100vh;
        padding: 40px;
      }
      .wrap { max-width: 1400px; margin: 0 auto; }
      ${floatingAuthButtonStyles}
      ${sharedPageHeaderStyles}
      ${floatingAuthButtonStyles}
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; background: var(--line); border: 2px solid var(--line); }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        padding: 18px;
      }
      .card h2 { font-size: 14px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.08em; }
      .row { display: grid; gap: 8px; margin-bottom: 10px; }
      label { font-size: 11px; color: var(--sub); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
      input, select, button {
        width: 100%;
        border: 1px solid var(--line);
        color: var(--text);
        font-size: 14px;
        padding: 9px 10px;
        background: #0b0b0b;
      }
      input::placeholder { color: var(--sub); }
      .window-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr auto;
        gap: 8px;
        margin-bottom: 8px;
      }
      .inline-actions { display: flex; gap: 8px; }
      .ai-help { color: var(--sub); font-size: 12px; margin-top: 6px; line-height: 1.4; }
      .btn:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }
      .btn {
        cursor: pointer;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .btn-icon {
        width: 13px;
        height: 13px;
        margin-right: 6px;
        vertical-align: -2px;
      }
      .btn-primary {
        border-color: var(--accent);
        background: var(--accent);
        color: var(--bg);
      }
      .btn-primary:hover { background: var(--accent-2); border-color: var(--accent-2); }
      .btn-ghost { background: #0b0b0b; color: var(--sub); }
      .btn-ghost:hover { color: var(--text); border-color: var(--accent); }
      .meeting-list { display: grid; gap: 8px; }
      .meeting-item {
        background: #0b0b0b;
        border: 1px solid var(--line);
        padding: 10px;
        text-decoration: none;
        color: inherit;
        display: block;
      }
      .meeting-item:hover { border-color: var(--accent); }
      .meeting-meta { color: var(--sub); font-size: 12px; margin-top: 4px; }
      @media (max-width: 900px) {
        body { padding: 20px; }
        .grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      ${renderBackToBoardLink()}
      <header class="page-header">
        <div>
          <h1 class="page-title">회의 시간 조율</h1>
          <p class="page-subtitle">When2Meet처럼 겹치는 가능한 시간을 시각화합니다.</p>
        </div>
      </header>

      <div class="grid">
        <section class="card">
          <h2>새 회의 만들기</h2>
          <form id="createForm">
            <div class="row">
              <label for="title">회의 제목</label>
              <input id="title" name="title" type="text" required placeholder="예: 프론트 주간 스탠드업" />
              <div class="inline-actions">
                <button type="button" class="btn btn-ghost" id="generateByAiBtn" ${isAiScheduleEnabled ? '' : 'disabled'}>
                  <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
                    <path d="M20 2v4"></path>
                    <path d="M22 4h-4"></path>
                    <circle cx="4" cy="20" r="2"></circle>
                  </svg>
                  AI로 일정 생성하기
                </button>
              </div>
              <p class="ai-help" id="aiHelp">${isAiScheduleEnabled ? '회의 주제를 대충 입력하고 버튼을 누르면 권장 시간대/회의 시간을 자동으로 채워줍니다.' : 'AI 일정 생성은 로그인 후 사용할 수 있습니다. /stats에서 로그인해주세요.'}</p>
            </div>
            <div class="row">
              <label for="duration">회의 시간</label>
              <select id="duration" name="duration_minutes">
                <option value="60" selected>1시간</option>
                <option value="120">2시간</option>
                <option value="180">3시간</option>
              </select>
            </div>
            <div class="row">
              <label>가능 시간 범위</label>
              <div id="windows"></div>
              <div class="inline-actions">
                <button type="button" class="btn btn-ghost" id="addWindowBtn">+ 시간대 추가</button>
              </div>
            </div>
            <button type="submit" class="btn btn-primary">회의 생성</button>
          </form>
        </section>

        <section class="card">
          <h2>최근 회의</h2>
          <div id="meetingList" class="meeting-list">
            <div class="meeting-meta">로딩 중...</div>
          </div>
        </section>
      </div>
    </div>

    <template id="windowTemplate">
      <div class="window-row">
        <select data-field="day">
          <option value="1">월요일</option>
          <option value="2">화요일</option>
          <option value="3">수요일</option>
          <option value="4">목요일</option>
          <option value="5">금요일</option>
          <option value="6">토요일</option>
          <option value="7">일요일</option>
        </select>
        <select data-field="startHour"></select>
        <select data-field="endHour"></select>
        <button type="button" class="btn btn-ghost" data-remove>삭제</button>
      </div>
    </template>

    <script>
      const windowsEl = document.getElementById('windows');
      const windowTemplate = document.getElementById('windowTemplate');
      const addWindowBtn = document.getElementById('addWindowBtn');
      const createForm = document.getElementById('createForm');
      const generateByAiBtn = document.getElementById('generateByAiBtn');
      const aiHelp = document.getElementById('aiHelp');
      const isAiScheduleEnabled = ${isAiScheduleEnabled ? 'true' : 'false'};
      const PROJECT_CONTEXT_STORAGE_KEY = 'projectCoreContext';

      function fillHourOptions(selectEl, selected) {
        selectEl.innerHTML = '';
        for (let h = 0; h <= 24; h++) {
          const option = document.createElement('option');
          option.value = String(h);
          option.textContent = String(h).padStart(2, '0') + ':00';
          if (h === selected) option.selected = true;
          selectEl.appendChild(option);
        }
      }

      function addWindowRow(day = 1, startHour = 9, endHour = 18) {
        const node = windowTemplate.content.cloneNode(true);
        const row = node.querySelector('.window-row');
        const daySelect = row.querySelector('select[data-field="day"]');
        const startSelect = row.querySelector('select[data-field="startHour"]');
        const endSelect = row.querySelector('select[data-field="endHour"]');
        const removeBtn = row.querySelector('[data-remove]');

        daySelect.value = String(day);
        fillHourOptions(startSelect, startHour);
        fillHourOptions(endSelect, endHour);

        removeBtn.addEventListener('click', () => row.remove());
        windowsEl.appendChild(row);
      }

      function getWindows() {
        const rows = windowsEl.querySelectorAll('.window-row');
        const windows = [];
        rows.forEach((row) => {
          const day = Number(row.querySelector('select[data-field="day"]').value);
          const startHour = Number(row.querySelector('select[data-field="startHour"]').value);
          const endHour = Number(row.querySelector('select[data-field="endHour"]').value);
          windows.push({ day, startHour, endHour });
        });
        return windows;
      }

      function setWindows(windows) {
        windowsEl.innerHTML = '';
        windows.forEach((w) => addWindowRow(Number(w.day), Number(w.startHour), Number(w.endHour)));
      }

      async function loadMeetings() {
        const list = document.getElementById('meetingList');
        list.innerHTML = '<div class="meeting-meta">로딩 중...</div>';
        try {
          const res = await fetch('/api/meetings');
          const data = await res.json();
          const items = data.meetings || [];
          if (!items.length) {
            list.innerHTML = '<div class="meeting-meta">아직 생성된 회의가 없습니다.</div>';
            return;
          }
          list.innerHTML = items.map((m) => {
            const summary = (m.windows || []).map((w) => DAY_LABELS[w.day] + ' ' + w.startHour + '-' + w.endHour).join(', ');
            return '<a class="meeting-item" href="/meetings/' + m.id + '">' +
              '<strong>' + escapeHtml(m.title) + '</strong>' +
              '<div class="meeting-meta">' + summary + ' · ' + m.duration_minutes + '분</div>' +
            '</a>';
          }).join('');
        } catch (error) {
          list.innerHTML = '<div class="meeting-meta">목록을 불러오지 못했습니다.</div>';
        }
      }

      const DAY_LABELS = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토', 7: '일' };

      function escapeHtml(value) {
        return String(value)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }

      function getProjectContext() {
        return (localStorage.getItem(PROJECT_CONTEXT_STORAGE_KEY) || '').trim();
      }

      addWindowBtn.addEventListener('click', () => addWindowRow());

      createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value.trim();
        const duration_minutes = Number(document.getElementById('duration').value);
        const windows = getWindows();
        if (!title) return alert('회의 제목을 입력해주세요.');
        if (!windows.length) return alert('최소 1개 시간 범위를 추가해주세요.');

        const res = await fetch('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, duration_minutes, timezone: 'Asia/Seoul', windows }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || '회의 생성 실패');
          return;
        }
        location.href = '/meetings/' + data.meeting_id;
      });

      generateByAiBtn.addEventListener('click', async () => {
        if (!isAiScheduleEnabled) {
          alert('AI 일정 생성은 로그인 후 사용할 수 있습니다. /stats에서 로그인해주세요.');
          return;
        }

        const titleInput = document.getElementById('title');
        const title = titleInput.value.trim();
        if (!title) {
          alert('먼저 회의 제목에 대략적인 회의 내용을 입력해주세요.');
          titleInput.focus();
          return;
        }

        const prevText = generateByAiBtn.textContent;
        generateByAiBtn.disabled = true;
        generateByAiBtn.textContent = '생성 중...';
        aiHelp.textContent = 'Gemini가 회의 시간대를 추천하는 중입니다.';

        try {
          const res = await fetch('/api/meetings/ai-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              project_context: getProjectContext(),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            alert(data.error || 'AI 일정 생성에 실패했습니다.');
            aiHelp.textContent = 'AI 일정 생성에 실패했습니다. 제목을 조금 더 구체적으로 입력해보세요.';
            return;
          }

          if (data.title) {
            titleInput.value = String(data.title);
          }
          if (data.duration_minutes) {
            document.getElementById('duration').value = String(data.duration_minutes);
          }
          if (Array.isArray(data.windows) && data.windows.length) {
            setWindows(data.windows);
          }
          const summary = Array.isArray(data.windows)
            ? data.windows.map((w) => DAY_LABELS[w.day] + ' ' + w.startHour + '-' + w.endHour).join(', ')
            : '';
          aiHelp.textContent = '추천 반영 완료: ' + summary;
        } catch (error) {
          aiHelp.textContent = 'AI 일정 생성 중 오류가 발생했습니다.';
          alert('AI 일정 생성 중 오류가 발생했습니다.');
        } finally {
          generateByAiBtn.disabled = !isAiScheduleEnabled;
          generateByAiBtn.textContent = prevText;
        }
      });

      addWindowRow(1, 9, 22);
      addWindowRow(2, 10, 15);
      loadMeetings();
    </script>
    ${renderFloatingAuthButton()}
  </body>
</html>
  `;
}

export function renderMeetingDetailPage(meetingId: number): string {
  return `
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>회의 시간 조율</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg: #000000;
        --panel: #111111;
        --text: #ffffff;
        --sub: #666666;
        --line: #222222;
        --accent: #ffffff;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: var(--bg);
        color: var(--text);
        min-height: 100vh;
        padding: 12px;
      }
      .wrap { max-width: 1400px; margin: 0 auto; }
      ${floatingAuthButtonStyles}
      .top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      h1 { font-size: 22px; text-transform: uppercase; letter-spacing: 0.04em; }
      .meta { color: var(--sub); font-size: 13px; margin-top: 4px; }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        padding: 8px;
        margin-bottom: 8px;
      }
      .controls {
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 8px;
      }
      input, button, a {
        border: 1px solid var(--line);
        padding: 7px 8px;
        font-size: 13px;
        background: #0b0b0b;
        color: var(--text);
      }
      input::placeholder { color: var(--sub); }
      button { cursor: pointer; font-weight: 700; background: var(--accent); color: var(--bg); border-color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
      button:hover { background: #dddddd; border-color: #dddddd; }
      a { text-decoration: none; color: inherit; background: #0b0b0b; }
      .legend { display: flex; gap: 10px; font-size: 11px; color: var(--sub); flex-wrap: wrap; }
      .grid-wrap { overflow: auto; border: 1px solid var(--line); }
      table { border-collapse: collapse; min-width: 780px; width: 100%; }
      th, td { border: 1px solid var(--line); text-align: center; padding: 4px; }
      thead th { position: sticky; top: 0; background: #0b0b0b; z-index: 1; font-size: 11px; }
      .time-col { width: 62px; font-size: 11px; color: var(--sub); background: #0b0b0b; }
      td.slot {
        cursor: pointer;
        font-size: 11px;
        height: 22px;
        min-width: 72px;
        transition: transform 0.06s ease;
        user-select: none;
      }
      td.slot:hover { transform: scale(1.01); }
      td.slot.invalid { background: #070707; cursor: default; }
      td.slot.mine { outline: 2px solid #ffffff; outline-offset: -2px; }
      .best-list { display: grid; gap: 5px; margin-top: 6px; }
      .best-item {
        border: 1px solid var(--line);
        background: #0b0b0b;
        padding: 6px;
        font-size: 12px;
      }
      .participants { color: var(--sub); font-size: 12px; margin-top: 6px; }
      @media (max-width: 760px) {
        .controls { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="top">
        <div style="display: flex; gap: 8px;">
          <a href="/meetings">← 회의 목록</a>
          <a href="/">티켓 보드로</a>
        </div>
      </div>

      <section class="card">
        <h1 id="title">로딩 중...</h1>
        <p id="meta" class="meta"></p>
      </section>

      <section class="card">
        <div class="controls">
          <input type="text" id="participantName" placeholder="이름 입력 (예: 민수)" />
          <button id="saveBtn">내 가능시간 저장</button>
          <button id="refreshBtn">새로고침</button>
        </div>
        <p class="participants" id="participants"></p>
        <div class="legend">
          <span>색이 진할수록 겹치는 인원이 많습니다.</span>
          <span>초록 테두리: 내가 선택한 시간</span>
        </div>
      </section>

      <section class="card">
        <div class="grid-wrap">
          <table id="table"></table>
        </div>
      </section>

      <section class="card">
        <h2 style="font-size: 15px;">추천 시간대 (겹치는 인원 순)</h2>
        <div id="bestSlots" class="best-list"></div>
      </section>
    </div>

    <script>
      const meetingId = ${meetingId};
      const DAY_LABELS = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토', 7: '일' };
      const participantInput = document.getElementById('participantName');
      const saveBtn = document.getElementById('saveBtn');
      const refreshBtn = document.getElementById('refreshBtn');
      const table = document.getElementById('table');
      const bestSlots = document.getElementById('bestSlots');

      let latestData = null;
      let selectedSlots = new Set();
      let isDragging = false;
      let dragShouldSelect = true;

      function slotKey(day, hour) {
        return String(day) + '-' + String(hour).padStart(2, '0');
      }

      function parseSlotKey(key) {
        const [d, h] = key.split('-');
        return { day: Number(d), hour: Number(h) };
      }

      function applySlotSelection(slotKey, cellEl, shouldSelect) {
        if (shouldSelect) {
          selectedSlots.add(slotKey);
          cellEl.classList.add('mine');
        } else {
          selectedSlots.delete(slotKey);
          cellEl.classList.remove('mine');
        }
      }

      function pickColor(count, maxCount) {
        if (count <= 0) return '#ffffff';
        const ratio = Math.min(1, count / Math.max(1, maxCount));
        const lightness = 97 - Math.round(ratio * 42);
        return 'hsl(173, 67%, ' + lightness + '%)';
      }

      async function loadMeeting() {
        const participantName = participantInput.value.trim();
        const qs = participantName ? ('?participant_name=' + encodeURIComponent(participantName)) : '';
        const res = await fetch('/api/meetings/' + meetingId + qs);
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || '회의 정보를 불러오지 못했습니다.');
          return;
        }
        latestData = data;
        selectedSlots = new Set(data.participant_slots || []);
        render();
      }

      function render() {
        const meeting = latestData.meeting;
        const windows = meeting.windows || [];
        const slotCounts = latestData.slot_counts || {};
        const participants = latestData.participants || [];
        const validSlots = new Set(latestData.valid_slots || []);

        document.getElementById('title').textContent = meeting.title;
        document.getElementById('meta').textContent =
          '회의 시간: ' + meeting.duration_minutes + '분 · 기준 시간대: ' + meeting.timezone;
        document.getElementById('participants').textContent =
          '참여자: ' + (participants.length ? participants.join(', ') : '아직 없음');

        const hours = [];
        windows.forEach((w) => {
          const durationHour = meeting.duration_minutes / 60;
          const lastStart = w.endHour - durationHour;
          for (let h = w.startHour; h <= lastStart; h++) {
            if (!hours.includes(h)) hours.push(h);
          }
        });
        hours.sort((a, b) => a - b);

        const maxCount = Math.max(0, ...Object.values(slotCounts));

        table.innerHTML = '';
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        const timeHead = document.createElement('th');
        timeHead.className = 'time-col';
        timeHead.textContent = '시간';
        headRow.appendChild(timeHead);
        for (let day = 1; day <= 7; day++) {
          const th = document.createElement('th');
          th.textContent = DAY_LABELS[day];
          headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        hours.forEach((hour) => {
          const tr = document.createElement('tr');
          const timeCol = document.createElement('td');
          timeCol.className = 'time-col';
          const endHour = hour + (meeting.duration_minutes / 60);
          timeCol.textContent = String(hour).padStart(2, '0') + ':00-' + String(endHour).padStart(2, '0') + ':00';
          tr.appendChild(timeCol);

          for (let day = 1; day <= 7; day++) {
            const key = slotKey(day, hour);
            const td = document.createElement('td');
            td.className = 'slot';
            if (!validSlots.has(key)) {
              td.classList.add('invalid');
              tr.appendChild(td);
              continue;
            }
            const count = Number(slotCounts[key] || 0);
            td.style.background = pickColor(count, maxCount);
            td.textContent = count > 0 ? String(count) : '';
            td.dataset.key = key;
            if (selectedSlots.has(key)) td.classList.add('mine');

            td.addEventListener('mousedown', (event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              isDragging = true;
              dragShouldSelect = !selectedSlots.has(key);
              applySlotSelection(key, td, dragShouldSelect);
            });

            td.addEventListener('mouseenter', () => {
              if (!isDragging) return;
              applySlotSelection(key, td, dragShouldSelect);
            });

            td.addEventListener('click', (event) => {
              event.preventDefault();
            });

            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        const sorted = Object.entries(slotCounts)
          .filter(([key]) => validSlots.has(key))
          .sort((a, b) => {
            if (Number(b[1]) !== Number(a[1])) return Number(b[1]) - Number(a[1]);
            const as = parseSlotKey(a[0]);
            const bs = parseSlotKey(b[0]);
            if (as.day !== bs.day) return as.day - bs.day;
            return as.hour - bs.hour;
          })
          .slice(0, 8);

        if (!sorted.length) {
          bestSlots.innerHTML = '<div class="best-item">아직 선택된 시간이 없습니다.</div>';
        } else {
          bestSlots.innerHTML = sorted.map(([key, count]) => {
            const s = parseSlotKey(key);
            return '<div class="best-item"><strong>' + DAY_LABELS[s.day] + '요일 ' + String(s.hour).padStart(2, '0') + ':00</strong> · ' + String(count) + '명 가능</div>';
          }).join('');
        }
      }

      saveBtn.addEventListener('click', async () => {
        const participant_name = participantInput.value.trim();
        if (!participant_name) {
          alert('이름을 입력해주세요.');
          participantInput.focus();
          return;
        }

        const res = await fetch('/api/meetings/' + meetingId + '/availability', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant_name,
            slots: Array.from(selectedSlots),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || '저장에 실패했습니다.');
          return;
        }
        await loadMeeting();
      });

      refreshBtn.addEventListener('click', loadMeeting);

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });

      document.addEventListener('mouseleave', () => {
        isDragging = false;
      });

      loadMeeting();
    </script>
    ${renderFloatingAuthButton()}
  </body>
</html>
  `;
}

export type { MeetingWindow };
