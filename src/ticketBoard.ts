/**
 * Ticket Board with editable dropdown cells
 */

export interface TicketItem {
  id: number;
  ticket_title: string; // The FE-001 ID
  ticket_description: string; // The actual work description
  status: 'pending' | 'in_progress' | 'completed';
  user_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  parent_ticket_id: number | null;
  sort_order: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface UserItem {
  user_id: string;
  user_name: string;
  display_name: string | null;
}

export function renderTicketBoardPage(tickets: TicketItem[], users: UserItem[]): string {
  const totalTickets = tickets.length;
  const pendingCount = tickets.filter(t => t.status === 'pending').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const completedCount = tickets.filter(t => t.status === 'completed').length;

  return `
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Sinsin Dangbu | Ticket Board</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg-color: #000000;
            --card-bg: #111111;
            --border-color: #222222;
            --text-primary: #ffffff;
            --text-secondary: #666666;
            --accent: #ffffff;
            --status-pending: #444444;
            --status-in-progress: #ffffff;
            --status-completed: #222222;
            --danger: #ff4444;
          }

          * { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }
          
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg-color);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 40px;
          }

          .container { max-width: 1400px; margin: 0 auto; }

          header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 60px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--accent);
          }

          .header-left h1 {
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -0.02em;
            text-transform: uppercase;
          }

          .header-left p {
            color: var(--text-secondary);
            font-size: 14px;
            margin-top: 4px;
          }

          .header-actions {
            display: flex;
            gap: 24px;
            align-items: flex-end;
          }

          .view-switcher {
            display: flex;
            border: 1px solid var(--border-color);
          }

          .status-filter-wrap {
            position: relative;
            display: inline-flex;
            align-items: center;
          }

          .status-filter-btn {
            background: transparent;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            cursor: pointer;
          }

          .status-filter-btn:hover {
            border-color: var(--accent);
          }

          .status-filter-dropdown {
            display: none;
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            min-width: 220px;
            background: #111111;
            border: 1px solid var(--border-color);
            z-index: 1200;
            padding: 10px;
          }

          .status-filter-dropdown.active {
            display: block;
          }

          .status-filter-title {
            color: var(--text-secondary);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 10px;
          }

          .status-filter-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--text-primary);
            margin-bottom: 8px;
            cursor: pointer;
            text-transform: uppercase;
          }

          .status-filter-item:last-child {
            margin-bottom: 0;
          }

          .nav-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: 8px 14px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            transition: border-color 0.2s, color 0.2s;
          }

          .nav-link:hover {
            border-color: var(--accent);
            color: var(--accent);
          }

          .status-column-trigger {
            cursor: pointer;
            user-select: none;
          }

          .status-column-trigger:hover {
            color: var(--text-primary);
          }

          .view-btn {
            background: transparent;
            color: var(--text-secondary);
            border: none;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
            transition: all 0.2s;
          }

          .view-btn.active {
            background: var(--accent);
            color: var(--bg-color);
          }

          .create-btn {
            background: var(--accent);
            color: var(--bg-color);
            border: none;
            padding: 12px 24px;
            font-weight: 700;
            text-transform: uppercase;
            cursor: pointer;
            transition: opacity 0.2s;
          }

          .create-btn:hover { opacity: 0.8; }

          .stats { display: flex; gap: 40px; align-items: flex-end; }
          .stat-item { text-align: left; }
          .stat-item .count { font-size: 24px; font-weight: 700; display: block; }
          .stat-item .label { font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; }

          /* Board View */
          .kanban-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2px;
            background: var(--border-color);
            border: 2px solid var(--border-color);
          }

          .kanban-column {
            background: var(--bg-color);
            padding: 16px;
            min-height: 70vh;
          }

          .column-header {
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .column-header h2 {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          .ticket-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            padding: 16px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: border-color 0.2s;
            position: relative;
          }

          .ticket-card:hover { border-color: var(--accent); }

          /* List View */
          .list-view {
            display: none;
            width: 100%;
            border-collapse: collapse;
          }

          .list-view.active { display: table; }

          .list-view th {
            text-align: left;
            padding: 12px 16px;
            font-size: 12px;
            text-transform: uppercase;
            color: var(--text-secondary);
            border-bottom: 2px solid var(--border-color);
          }

          .list-col-meta-stack {
            display: none;
          }

          .meta-stack-head {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .list-view td {
            padding: 12px 16px;
            font-size: 14px;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-color);
          }

          .list-view tr:hover td {
            background: var(--card-bg);
          }

          .list-row.dragging td {
            opacity: 0.4;
          }

          .list-row.drop-target td {
            border-top: 2px solid var(--accent);
            border-bottom: 2px solid var(--accent);
            background: #0b0b0b;
          }

          .drag-handle {
            cursor: grab;
            color: var(--text-secondary);
            margin-right: 10px;
            font-size: 11px;
            user-select: none;
          }

          .drag-handle:active {
            cursor: grabbing;
          }

          .task-cell {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 28px;
          }

          .task-branch {
            color: var(--text-secondary);
            font-size: 12px;
            width: 14px;
            text-align: center;
            flex: 0 0 auto;
          }

          .list-hint {
            margin-top: 8px;
            color: var(--text-secondary);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .status-tag {
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            text-transform: uppercase;
            border: 1px solid currentColor;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
          }
          .status-tag:hover {
            background: var(--accent);
            color: var(--bg-color) !important;
          }

          .id-tag {
            font-size: 10px;
            font-weight: 700;
            color: var(--text-secondary);
            margin-bottom: 8px;
            display: block;
          }

          .ticket-desc {
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 12px;
          }

          .card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: var(--text-secondary);
          }

          .assignee { display: flex; align-items: center; gap: 8px; cursor: pointer; transition: color 0.2s; }
          .assignee:hover { color: var(--text-primary); }
          .assignee-box {
            width: 20px;
            height: 20px;
            background: var(--border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: var(--text-primary);
            font-weight: 700;
          }

          .dropdown-menu {
            display: none;
            position: absolute;
            background: #111111;
            border: 1px solid var(--border-color);
            z-index: 1000;
            min-width: 160px;
            padding: 4px 0;
            top: 24px;
            right: 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          .dropdown-menu.active { display: block; }
          .dropdown-group { border-top: 1px solid var(--border-color); margin-top: 4px; padding-top: 4px; }
          .dropdown-item {
            padding: 8px 16px;
            font-size: 11px;
            cursor: pointer;
            color: var(--text-secondary);
            text-transform: uppercase;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .dropdown-item:hover {
            background: var(--accent);
            color: var(--bg-color);
          }
          .dropdown-item.danger:hover {
            background: var(--danger);
            color: white;
          }

          .modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.95);
            z-index: 2000;
            align-items: center;
            justify-content: center;
          }
          .modal.active { display: flex; }
          .modal-content {
            background: var(--bg-color);
            border: 2px solid var(--accent);
            padding: 40px;
            width: 90%;
            max-width: 600px;
          }

          textarea {
            width: 100%;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            padding: 16px;
            color: white;
            font-family: inherit;
            resize: none;
            margin: 24px 0;
            font-size: 16px;
          }
          textarea:focus { outline: none; border-color: var(--accent); }

          [data-view="list"] .kanban-grid { display: none; }
          [data-view="list"] .list-view { display: table; }
          [data-view="board"] .list-view { display: none; }

          @media (max-width: 1024px) {
            .kanban-grid { grid-template-columns: 1fr; }
            .header-actions { flex-direction: column; align-items: stretch; gap: 16px; }
            .stats { gap: 20px; }
            body { padding: 20px; }
          }

          @media (max-width: 1200px) {
            [data-view="list"] .list-view {
              border-collapse: separate;
              border-spacing: 0;
            }

            [data-view="list"] .list-view thead tr {
              display: grid;
              grid-template-columns: 120px minmax(280px, 1fr) minmax(180px, 240px);
              grid-template-areas: "id task meta";
              border-bottom: 2px solid var(--border-color);
            }

            [data-view="list"] .list-view thead th {
              border-bottom: none;
            }

            [data-view="list"] .list-view .list-col-id { grid-area: id; }
            [data-view="list"] .list-view .list-col-task { grid-area: task; }
            [data-view="list"] .list-view .list-col-meta-stack { grid-area: meta; display: block; }

            [data-view="list"] .list-view .list-col-status,
            [data-view="list"] .list-view .list-col-assignee,
            [data-view="list"] .list-view .list-col-date {
              display: none;
            }

            [data-view="list"] .list-view tbody .list-row {
              display: grid;
              grid-template-columns: 120px minmax(280px, 1fr) minmax(180px, 240px);
              grid-template-areas:
                "id task status"
                "id task assignee"
                "id task date";
              align-items: center;
              border-bottom: 1px solid var(--border-color);
            }

            [data-view="list"] .list-view tbody td {
              border-bottom: none;
            }

            [data-view="list"] .list-view tbody .list-col-id {
              grid-area: id;
            }

            [data-view="list"] .list-view tbody .list-col-task {
              grid-area: task;
            }

            [data-view="list"] .list-view tbody .list-col-status {
              grid-area: status;
              display: block;
              padding-top: 10px;
              padding-bottom: 6px;
            }

            [data-view="list"] .list-view tbody .list-col-assignee {
              grid-area: assignee;
              display: block;
              padding-top: 6px;
              padding-bottom: 6px;
            }

            [data-view="list"] .list-view tbody .list-col-date {
              grid-area: date;
              display: block;
              padding-top: 6px;
              padding-bottom: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container" id="mainContainer" data-view="board">
          <header>
            <div class="header-left">
              <h1>SINSIN DANGBU</h1>
              <p>MINIMALIST TICKET MANAGEMENT</p>
            </div>
            <div class="header-actions">
              <div class="view-switcher">
                <button class="view-btn active" id="boardViewBtn" onclick="switchView('board')">Board</button>
                <button class="view-btn" id="listViewBtn" onclick="switchView('list')">List</button>
              </div>
              <div class="status-filter-wrap" id="statusFilterWrap">
                <button class="status-filter-btn" id="statusFilterBtn" onclick="toggleStatusFilter(event)">Status</button>
                <div class="status-filter-dropdown" id="statusFilterDropdown" onclick="event.stopPropagation()">
                  <div class="status-filter-title">Visible Status</div>
                  <label class="status-filter-item">
                    <input type="checkbox" data-filter-status="pending" checked />
                    <span>Pending</span>
                  </label>
                  <label class="status-filter-item">
                    <input type="checkbox" data-filter-status="in_progress" checked />
                    <span>In Progress</span>
                  </label>
                  <label class="status-filter-item">
                    <input type="checkbox" data-filter-status="completed" checked />
                    <span>Done</span>
                  </label>
                </div>
              </div>
              <a class="nav-link" href="/stats">Stats</a>
              <a class="nav-link" href="/meetings">Meetings</a>
              <div class="stats">
                <div class="stat-item">
                  <span class="label">Total</span>
                  <span class="count">${totalTickets}</span>
                </div>
                <div class="stat-item">
                  <span class="label">Doing</span>
                  <span class="count">${inProgressCount}</span>
                </div>
                <div class="stat-item">
                  <span class="label">Done</span>
                  <span class="count">${completedCount}</span>
                </div>
                <button class="create-btn" onclick="openCreateModal()">New Task</button>
              </div>
            </div>
          </header>

          <!-- Board View -->
          <div class="kanban-grid">
            <div class="kanban-column">
              <div class="column-header">
                <h2>Pending [${pendingCount}]</h2>
              </div>
              ${renderColumnCards(tickets, 'pending', users)}
            </div>

            <div class="kanban-column" style="border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color);">
              <div class="column-header">
                <h2>In Progress [${inProgressCount}]</h2>
              </div>
              ${renderColumnCards(tickets, 'in_progress', users)}
            </div>

            <div class="kanban-column">
              <div class="column-header">
                <h2>Completed [${completedCount}]</h2>
              </div>
              ${renderColumnCards(tickets, 'completed', users)}
            </div>
          </div>

          <!-- List View -->
          <table class="list-view">
            <thead>
              <tr>
                <th style="width: 120px;" class="list-col-id">ID</th>
                <th class="list-col-task">Task Description</th>
                <th style="width: 180px;" class="list-col-status status-column-trigger" id="statusColumnHeader" onclick="toggleStatusFilter(event)">Status</th>
                <th style="width: 180px;" class="list-col-assignee">Assignee</th>
                <th style="width: 100px;" class="list-col-date">Date</th>
                <th class="list-col-meta-stack">
                  <div class="meta-stack-head">
                    <span>Status</span>
                    <span>Assignee</span>
                    <span>Date</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              ${renderListRows(tickets, users)}
            </tbody>
          </table>
          <p class="list-hint">List view: drag a task onto another task to make it a subtask.</p>
        </div>

        <!-- Create Modal -->
        <div class="modal" id="createModal">
          <div class="modal-content">
            <h2 style="text-transform: uppercase; letter-spacing: 0.1em;">Create Task</h2>
            <form onsubmit="createTicket(event)">
              <textarea name="ticketDescription" rows="4" placeholder="DESCRIBE THE TASK..." required></textarea>
              <div style="display: flex; gap: 16px; justify-content: flex-end;">
                <button type="button" class="create-btn" style="background: var(--card-bg); color: white; border: 1px solid var(--border-color);" onclick="closeCreateModal()">Cancel</button>
                <button type="submit" class="create-btn">Create</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Edit Modal -->
        <div class="modal" id="editModal">
          <div class="modal-content">
            <h2 style="text-transform: uppercase; letter-spacing: 0.1em;">Edit Task</h2>
            <form id="editForm" onsubmit="submitEdit(event)">
              <input type="hidden" id="editTicketId">
              <textarea id="editDescriptionInput" name="ticketDescription" rows="4" required></textarea>
              <div style="display: flex; gap: 16px; justify-content: flex-end;">
                <button type="button" class="create-btn" style="background: var(--card-bg); color: white; border: 1px solid var(--border-color);" onclick="closeEditModal()">Cancel</button>
                <button type="submit" class="create-btn">Update</button>
              </div>
            </form>
          </div>
        </div>

        <script>
          let currentDropdown = null;
          let draggedTicketId = null;
          let draggedRow = null;
          let draggedPath = '';
          const STATUS_FILTER_STORAGE_KEY = 'ticketStatusFilter';
          let statusFilterState = {
            pending: true,
            in_progress: true,
            completed: true,
          };

          function switchView(view) {
            const container = document.getElementById('mainContainer');
            const boardBtn = document.getElementById('boardViewBtn');
            const listBtn = document.getElementById('listViewBtn');
            
            container.setAttribute('data-view', view);
            localStorage.setItem('ticketView', view);
            
            if (view === 'board') {
              boardBtn.classList.add('active');
              listBtn.classList.remove('active');
            } else {
              boardBtn.classList.remove('active');
              listBtn.classList.add('active');
            }
          }

          window.addEventListener('DOMContentLoaded', () => {
            const savedView = localStorage.getItem('ticketView');
            if (savedView) switchView(savedView);
            initializeStatusFilter();
            initListDragAndDrop();
          });

          function toggleStatusFilter(event) {
            event.stopPropagation();
            const dropdown = document.getElementById('statusFilterDropdown');
            if (!dropdown) return;
            dropdown.classList.toggle('active');
          }

          function loadStatusFilterState() {
            try {
              const raw = localStorage.getItem(STATUS_FILTER_STORAGE_KEY);
              if (!raw) return;
              const parsed = JSON.parse(raw);
              statusFilterState = {
                pending: parsed.pending !== false,
                in_progress: parsed.in_progress !== false,
                completed: parsed.completed !== false,
              };
            } catch {
              statusFilterState = {
                pending: true,
                in_progress: true,
                completed: true,
              };
            }
          }

          function saveStatusFilterState() {
            localStorage.setItem(STATUS_FILTER_STORAGE_KEY, JSON.stringify(statusFilterState));
          }

          function updateStatusFilterButtonLabel() {
            const btn = document.getElementById('statusFilterBtn');
            if (!btn) return;
            const activeCount = Object.values(statusFilterState).filter(Boolean).length;
            btn.textContent = 'Status (' + activeCount + ')';
          }

          function applyStatusFilter() {
            const items = document.querySelectorAll('[data-status]');
            items.forEach((el) => {
              const status = el.dataset.status;
              const visible = status ? Boolean(statusFilterState[status]) : true;
              el.style.display = visible ? '' : 'none';
            });
            updateStatusFilterButtonLabel();
          }

          function initializeStatusFilter() {
            loadStatusFilterState();
            const checkboxes = document.querySelectorAll('input[data-filter-status]');
            checkboxes.forEach((input) => {
              const status = input.dataset.filterStatus;
              input.checked = status ? Boolean(statusFilterState[status]) : true;
              input.addEventListener('change', () => {
                if (!status) return;
                statusFilterState[status] = input.checked;
                const activeCount = Object.values(statusFilterState).filter(Boolean).length;
                if (activeCount === 0) {
                  statusFilterState[status] = true;
                  input.checked = true;
                  return;
                }
                saveStatusFilterState();
                applyStatusFilter();
              });
            });
            applyStatusFilter();
          }

          function clearDropTargets() {
            document.querySelectorAll('.list-row.drop-target').forEach((row) => {
              row.classList.remove('drop-target');
            });
          }

          function pathContainsTicketId(path, ticketId) {
            if (!path) return false;
            return String(path).split('.').includes(String(ticketId));
          }

          function getPathDepth(path) {
            if (!path) return 0;
            return String(path).split('.').length - 1;
          }

          function getPathParts(path) {
            if (!path) return [];
            return String(path).split('.');
          }

          function isDescendantPath(path, ancestorPath) {
            return path === ancestorPath || path.startsWith(ancestorPath + '.');
          }

          function getSubtreeRows(path) {
            return Array.from(document.querySelectorAll('.list-row[data-path]')).filter((row) => {
              const rowPath = row.dataset.path || '';
              return isDescendantPath(rowPath, path);
            });
          }

          function getLastRowInSubtree(path) {
            const rows = Array.from(document.querySelectorAll('.list-row[data-path]'));
            let last = null;
            rows.forEach((row) => {
              const rowPath = row.dataset.path || '';
              if (isDescendantPath(rowPath, path)) {
                last = row;
              }
            });
            return last;
          }

          function updateRowVisualDepth(row, path) {
            const depth = getPathDepth(path);
            const taskCell = row.querySelector('.task-cell');
            const branch = row.querySelector('.task-branch');
            if (taskCell) {
              taskCell.style.paddingLeft = String(depth * 26) + 'px';
            }
            if (branch) {
              branch.textContent = depth > 0 ? '└' : '';
            }
          }

          function applyOptimisticHierarchyMove(sourcePath, targetPath) {
            const sourceRows = getSubtreeRows(sourcePath);
            if (!sourceRows.length) return false;

            const sourceRoot = sourceRows[0];
            const sourceId = String(sourceRoot.dataset.ticketId || '');
            const sourcePathParts = getPathParts(sourcePath);
            const targetPathParts = getPathParts(targetPath);

            const fragment = document.createDocumentFragment();
            sourceRows.forEach((row) => fragment.appendChild(row));

            const insertAfter = getLastRowInSubtree(targetPath);
            if (!insertAfter || !insertAfter.parentNode) return false;
            insertAfter.parentNode.insertBefore(fragment, insertAfter.nextSibling);

            sourceRows.forEach((row) => {
              const oldPath = row.dataset.path || '';
              const oldParts = getPathParts(oldPath);
              const suffix = oldParts.slice(sourcePathParts.length);
              const newParts = targetPathParts.concat([sourceId], suffix);
              const newPath = newParts.join('.');
              row.dataset.path = newPath;
              updateRowVisualDepth(row, newPath);
            });

            return true;
          }

          function initListDragAndDrop() {
            const rows = document.querySelectorAll('.list-row[data-ticket-id]');
            rows.forEach((row) => {
              row.addEventListener('dragstart', (event) => {
                draggedTicketId = Number(row.dataset.ticketId);
                draggedRow = row;
                draggedPath = row.dataset.path || '';
                row.classList.add('dragging');
                if (event.dataTransfer) {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(draggedTicketId));
                }
              });

              row.addEventListener('dragover', (event) => {
                const targetId = Number(row.dataset.ticketId);
                const targetPath = row.dataset.path || '';
                if (!draggedTicketId || targetId === draggedTicketId || pathContainsTicketId(targetPath, draggedTicketId)) {
                  return;
                }
                event.preventDefault();
                clearDropTargets();
                row.classList.add('drop-target');
              });

              row.addEventListener('dragleave', () => {
                row.classList.remove('drop-target');
              });

              row.addEventListener('drop', async (event) => {
                event.preventDefault();
                const targetId = Number(row.dataset.ticketId);
                const targetPath = row.dataset.path || '';
                clearDropTargets();

                if (!draggedTicketId || targetId === draggedTicketId || pathContainsTicketId(targetPath, draggedTicketId)) {
                  return;
                }

                const moved = applyOptimisticHierarchyMove(draggedPath, targetPath);
                if (!moved) {
                  return;
                }

                const response = await fetch(\`/api/tickets/\${draggedTicketId}/hierarchy\`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ parent_ticket_id: targetId })
                });

                if (!response.ok) {
                  const data = await response.json().catch(() => ({ error: '계층 변경 실패' }));
                  alert(data.error || '계층 변경 실패');
                  window.location.reload();
                }
              });

              row.addEventListener('dragend', () => {
                clearDropTargets();
                if (draggedRow) draggedRow.classList.remove('dragging');
                draggedRow = null;
                draggedTicketId = null;
                draggedPath = '';
              });
            });
          }

          function toggleDropdown(event) {
            event.stopPropagation();
            const btn = event.currentTarget;
            let menu = btn.nextElementSibling;
            
            // If the button is nested in another div, we might need a different traversal
            if (!menu || !menu.classList.contains('dropdown-menu')) {
               menu = btn.parentElement.querySelector('.dropdown-menu');
            }
            
            if (currentDropdown && currentDropdown !== menu) {
              currentDropdown.classList.remove('active');
            }
            
            if (menu) {
              menu.classList.toggle('active');
              currentDropdown = menu.classList.contains('active') ? menu : null;
            }
          }

          async function updateStatus(ticketId, status) {
            const response = await fetch(\`/api/tickets/\${ticketId}/status\`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status })
            });
            if (response.ok) window.location.reload();
          }

          async function updateAssignee(ticketId, userId, userName) {
            const response = await fetch(\`/api/tickets/\${ticketId}/assignee\`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ assignee_id: userId, assignee_name: userName })
            });
            if (response.ok) window.location.reload();
          }

          async function deleteTicket(ticketId) {
            if (!confirm('Are you sure you want to delete this task?')) return;
            const response = await fetch(\`/api/tickets/\${ticketId}\`, {
              method: 'DELETE'
            });
            if (response.ok) window.location.reload();
          }

          function openCreateModal() { document.getElementById('createModal').classList.add('active'); }
          function closeCreateModal() { document.getElementById('createModal').classList.remove('active'); }

          function openEditModal(ticketId, description) {
            document.getElementById('editTicketId').value = ticketId;
            document.getElementById('editDescriptionInput').value = description;
            document.getElementById('editModal').classList.add('active');
          }
          function closeEditModal() { document.getElementById('editModal').classList.remove('active'); }

          function editTicketDescription(ticketId, currentDesc) {
            openEditModal(ticketId, currentDesc);
          }

          async function createTicket(event) {
            event.preventDefault();
            const description = event.target.ticketDescription.value;
            const response = await fetch('/api/tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ description })
            });
            if (response.ok) window.location.reload();
          }

          async function submitEdit(event) {
            event.preventDefault();
            const ticketId = document.getElementById('editTicketId').value;
            const description = document.getElementById('editDescriptionInput').value;
            
            const response = await fetch(\`/api/tickets/\${ticketId}/description\`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ description })
            });
            if (response.ok) window.location.reload();
          }

          document.addEventListener('click', () => {
            if (currentDropdown) {
              currentDropdown.classList.remove('active');
              currentDropdown = null;
            }
            const statusDropdown = document.getElementById('statusFilterDropdown');
            if (statusDropdown) {
              statusDropdown.classList.remove('active');
            }
          });

          document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;

            const createModal = document.getElementById('createModal');
            const editModal = document.getElementById('editModal');

            if (createModal && createModal.classList.contains('active')) {
              closeCreateModal();
            }
            if (editModal && editModal.classList.contains('active')) {
              closeEditModal();
            }
          });
        </script>
      </body>
    </html>
  `;
}

function renderColumnCards(tickets: TicketItem[], status: string, users: UserItem[]): string {
  return tickets
    .filter(t => t.status === status)
    .map(t => {
      const escapeDesc = escapeHtml(t.ticket_description).replace(/'/g, "\\'");
      return `
        <div class="ticket-card" data-status="${t.status}" onclick="editTicketDescription(${t.id}, '${escapeDesc}')">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span class="id-tag">${escapeHtml(t.ticket_title)}</span>
            <div style="position: relative;">
              <span style="font-size: 10px; cursor: pointer; color: var(--text-secondary); font-weight: 700; border: 1px solid var(--border-color); padding: 2px 6px;" onclick="toggleDropdown(event)">MENU</span>
              <div class="dropdown-menu">
                <div class="dropdown-item" onclick="updateStatus(${t.id}, 'pending')">Move to Pending</div>
                <div class="dropdown-item" onclick="updateStatus(${t.id}, 'in_progress')">Move to In Progress</div>
                <div class="dropdown-item" onclick="updateStatus(${t.id}, 'completed')">Move to Completed</div>
                <div class="dropdown-group">
                   <div class="dropdown-item danger" onclick="deleteTicket(${t.id})">Delete Task</div>
                </div>
              </div>
            </div>
          </div>
          <div class="ticket-desc">${escapeHtml(t.ticket_description)}</div>
          
          <div class="card-footer">
            <div style="position: relative;">
              <div class="assignee" onclick="toggleDropdown(event)">
                <div class="assignee-box">${(t.assignee_name || t.user_name || 'U').charAt(0)}</div>
                <span>${escapeHtml(t.assignee_name || t.user_name || 'USER').toUpperCase()}</span>
              </div>
              <div class="dropdown-menu" style="top: auto; bottom: 24px; left: 0;">
                ${users.map(u => `
                  <div class="dropdown-item" onclick="updateAssignee(${t.id}, '${u.user_id}', '${u.user_name}')">${escapeHtml(u.user_name)}</div>
                `).join('')}
              </div>
            </div>
            <span>${formatDate(t.created_at)}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderListRows(tickets: TicketItem[], users: UserItem[]): string {
  const childrenByParent = new Map<number | null, TicketItem[]>();
  for (const ticket of tickets) {
    const key = ticket.parent_ticket_id ?? null;
    if (!childrenByParent.has(key)) {
      childrenByParent.set(key, []);
    }
    childrenByParent.get(key)!.push(ticket);
  }

  for (const group of childrenByParent.values()) {
    group.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  const renderBranch = (parentId: number | null, depth: number, path: number[]): string => {
    const children = childrenByParent.get(parentId) || [];
    return children.map((ticket) => {
      const currentPath = [...path, ticket.id];
      return renderListRow(ticket, users, depth, currentPath) + renderBranch(ticket.id, depth + 1, currentPath);
    }).join('');
  };

  return renderBranch(null, 0, []);
}

function renderListRow(t: TicketItem, users: UserItem[], depth: number, path: number[]): string {
  const statusColor = t.status === 'completed' ? 'var(--status-completed)' :
    t.status === 'in_progress' ? 'var(--status-in-progress)' : 'var(--status-pending)';
  const escapeDesc = escapeHtml(t.ticket_description).replace(/'/g, "\\'");
  const leftIndent = depth * 26;
  const branchMark = depth > 0 ? '└' : '';

  return `
    <tr class="list-row" draggable="true" data-ticket-id="${t.id}" data-path="${path.join('.')}" data-status="${t.status}">
      <td class="list-col-id" style="font-weight: 700; color: var(--text-secondary); font-size: 11px; letter-spacing: 0.05em;">
        <span class="drag-handle">⋮⋮</span>${escapeHtml(t.ticket_title)}
      </td>
      <td class="list-col-task">
        <div class="task-cell" style="padding-left: ${leftIndent}px;">
          <span class="task-branch">${branchMark}</span>
          <span style="cursor: pointer;" onclick="editTicketDescription(${t.id}, '${escapeDesc}')">${escapeHtml(t.ticket_description)}</span>
        </div>
      </td>
      <td class="list-col-status">
        <div style="position: relative; display: inline-block;">
          <span class="status-tag" style="color: ${statusColor}; border-color: ${statusColor}" onclick="toggleDropdown(event)">${t.status.replace('_', ' ')}</span>
          <div class="dropdown-menu" style="left: 0; right: auto;">
            <div class="dropdown-item" onclick="updateStatus(${t.id}, 'pending')">Pending</div>
            <div class="dropdown-item" onclick="updateStatus(${t.id}, 'in_progress')">In Progress</div>
            <div class="dropdown-item" onclick="updateStatus(${t.id}, 'completed')">Completed</div>
            <div class="dropdown-group">
               <div class="dropdown-item danger" onclick="deleteTicket(${t.id})">Delete Task</div>
            </div>
          </div>
        </div>
      </td>
      <td class="list-col-assignee">
        <div style="position: relative;">
          <div class="assignee" onclick="toggleDropdown(event)">
            <div class="assignee-box">${(t.assignee_name || t.user_name || 'U').charAt(0)}</div>
            <span style="font-size: 11px; font-weight: 600;">${escapeHtml(t.assignee_name || t.user_name || 'USER').toUpperCase()}</span>
          </div>
          <div class="dropdown-menu" style="left: 0; right: auto;">
            ${users.map(u => `
              <div class="dropdown-item" onclick="updateAssignee(${t.id}, '${u.user_id}', '${u.user_name}')">${escapeHtml(u.user_name)}</div>
            `).join('')}
          </div>
        </div>
      </td>
      <td class="list-col-date" style="color: var(--text-secondary); font-size: 11px; font-weight: 600;">${formatDate(t.created_at)}</td>
    </tr>
  `;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}.${day}`;
}

function getStatusEmoji(status: string): string {
  const emojis: { [key: string]: string } = {
    pending: '⏸️',
    in_progress: '▶️',
    completed: '✅'
  };
  return emojis[status] || '⏸️';
}

function getStatusLabel(status: string): string {
  const labels: { [key: string]: string } = {
    pending: '대기',
    in_progress: '진행',
    completed: '완료'
  };
  return labels[status] || '대기';
}
