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
        <title>AURA | Ticket Board</title>
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
            padding: 24px;
            min-height: 70vh;
          }

          .column-header {
            margin-bottom: 32px;
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
            padding: 24px;
            margin-bottom: 24px;
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
            padding: 16px 24px;
            font-size: 12px;
            text-transform: uppercase;
            color: var(--text-secondary);
            border-bottom: 2px solid var(--border-color);
          }

          .list-view td {
            padding: 20px 24px;
            font-size: 14px;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-color);
          }

          .list-view tr:hover td {
            background: var(--card-bg);
          }

          .status-tag {
            font-size: 10px;
            font-weight: 700;
            padding: 4px 8px;
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
            margin-bottom: 12px;
            display: block;
          }

          .ticket-desc {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 24px;
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
        </style>
      </head>
      <body>
        <div class="container" id="mainContainer" data-view="board">
          <header>
            <div class="header-left">
              <h1>AURA BOARD</h1>
              <p>MINIMALIST TICKET MANAGEMENT</p>
            </div>
            <div class="header-actions">
              <div class="view-switcher">
                <button class="view-btn active" id="boardViewBtn" onclick="switchView('board')">Board</button>
                <button class="view-btn" id="listViewBtn" onclick="switchView('list')">List</button>
              </div>
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
                <th style="width: 120px;">ID</th>
                <th>Task Description</th>
                <th style="width: 180px;">Status</th>
                <th style="width: 180px;">Assignee</th>
                <th style="width: 100px;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${renderListRows(tickets, users)}
            </tbody>
          </table>
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
          });

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
        <div class="ticket-card" onclick="editTicketDescription(${t.id}, '${escapeDesc}')">
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
  return tickets
    .map(t => {
      const statusColor = t.status === 'completed' ? 'var(--status-completed)' :
        t.status === 'in_progress' ? 'var(--status-in-progress)' : 'var(--status-pending)';
      const escapeDesc = escapeHtml(t.ticket_description).replace(/'/g, "\\'");

      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-secondary); font-size: 11px; letter-spacing: 0.05em;">${escapeHtml(t.ticket_title)}</td>
          <td style="cursor: pointer;" onclick="editTicketDescription(${t.id}, '${escapeDesc}')">${escapeHtml(t.ticket_description)}</td>
          <td>
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
          <td>
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
          <td style="color: var(--text-secondary); font-size: 11px; font-weight: 600;">${formatDate(t.created_at)}</td>
        </tr>
      `;
    })
    .join('');
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
