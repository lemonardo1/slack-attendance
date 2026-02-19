/**
 * Ticket Board with editable dropdown cells
 */
import { floatingAuthButtonStyles, renderFloatingAuthButton } from './sharedPageHeader';

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
  const weeklyProgress = renderWeekProgress(tickets);
  const assigneeFilterNames = Array.from(
    new Set(
      tickets
        .map((t) => (t.assignee_name || t.user_name || 'Unassigned').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

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
            --header-btn-height: 34px;
          }
          ${floatingAuthButtonStyles}

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
            margin-bottom: 12px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--accent);
          }

          .week-progress {
            display: grid;
            grid-template-columns: repeat(52, minmax(0, 1fr));
            gap: 0;
            margin-bottom: 32px;
            user-select: none;
          }

          .week-cell {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 5px;
            font-size: 20px;
            line-height: 1;
            color: var(--text-secondary);
            cursor: default;
          }

          .week-cell.filled {
            color: var(--text-primary);
          }

          .week-cell.empty {
            color: #2f2f2f;
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
          .project-context-trigger {
            cursor: pointer;
            user-select: none;
          }
          .project-context-trigger:hover h1 {
            color: var(--text-secondary);
          }

          .header-actions {
            display: flex;
            gap: 16px;
            align-items: flex-end;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .view-switcher {
            display: flex;
            border: 1px solid var(--border-color);
            overflow: hidden;
          }

          .header-nav-links {
            display: flex;
            align-items: stretch;
            gap: 8px;
            flex-wrap: nowrap;
          }

          .status-filter-wrap {
            position: relative;
            display: inline-flex;
            align-items: center;
          }

          .status-filter-label {
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .status-filter-dropdown {
            display: none;
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            min-width: 220px;
            max-width: min(220px, calc(100vw - 24px));
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

          .filter-sort-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-top: 10px;
          }

          .filter-sort-btn {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
            padding: 8px 10px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            cursor: pointer;
            transition: border-color 0.2s, color 0.2s;
          }

          .filter-sort-btn:hover,
          .filter-sort-btn.active {
            color: var(--text-primary);
            border-color: var(--text-primary);
          }

          .nav-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            height: var(--header-btn-height);
            padding: 0 14px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            transition: border-color 0.2s, color 0.2s;
            line-height: 1;
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
            height: var(--header-btn-height);
            padding: 0 22px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
            transition: all 0.2s;
            margin: 0;
            line-height: 1;
          }

          .view-btn + .view-btn {
            border-left: 1px solid var(--border-color);
          }

          .view-btn.active {
            background: var(--accent);
            color: var(--bg-color);
          }

          .create-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--accent);
            color: var(--bg-color);
            border: none;
            height: var(--header-btn-height);
            padding: 0 24px;
            font-weight: 700;
            text-transform: uppercase;
            cursor: pointer;
            transition: opacity 0.2s;
            line-height: 1;
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
          .dropdown-item-leading {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .sparkles-icon {
            width: 13px;
            height: 13px;
            flex-shrink: 0;
          }
          .dropdown-inline-panel {
            padding: 10px 14px 12px;
            border-top: 1px solid var(--border-color);
            display: none;
            gap: 8px;
            flex-direction: column;
          }
          .dropdown-inline-panel.active {
            display: flex;
          }
          .dropdown-inline-textarea {
            width: 100%;
            min-height: 64px;
            resize: vertical;
            background: var(--bg-color);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-size: 12px;
            line-height: 1.4;
            padding: 8px;
          }
          .dropdown-inline-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
          }
          .dropdown-inline-hint {
            color: var(--text-secondary);
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            white-space: nowrap;
          }
          .dropdown-inline-status {
            min-height: 14px;
            color: var(--text-secondary);
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .dropdown-inline-input {
            width: 100%;
            background: var(--bg-color);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-size: 12px;
            line-height: 1.4;
            padding: 8px;
          }
          .dropdown-inline-input:focus {
            outline: none;
            border-color: var(--accent);
          }
          .dropdown-item:hover {
            background: var(--accent);
            color: var(--bg-color);
          }
          .dropdown-item.danger:hover {
            background: var(--danger);
            color: white;
          }

          .task-desc-inline-edit {
            margin-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .task-desc-inline-edit textarea {
            width: 100%;
            background: var(--bg-color);
            border: 1px solid var(--accent);
            color: var(--text-primary);
            padding: 10px;
            margin: 0;
            font-size: 13px;
            line-height: 1.4;
            resize: vertical;
            min-height: 80px;
          }

          .task-desc-inline-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }

          .inline-btn {
            border: 1px solid var(--border-color);
            background: var(--card-bg);
            color: var(--text-primary);
            padding: 6px 10px;
            text-transform: uppercase;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
          }

          .inline-btn:hover {
            border-color: var(--accent);
          }

          .inline-btn.primary {
            background: var(--accent);
            color: var(--bg-color);
            border-color: var(--accent);
          }

          .parent-select-hint {
            display: none;
            position: fixed;
            left: 50%;
            bottom: 16px;
            transform: translateX(-50%);
            z-index: 2200;
            background: var(--card-bg);
            border: 1px solid var(--accent);
            color: var(--text-primary);
            padding: 10px 12px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            gap: 10px;
            align-items: center;
          }

          .parent-select-hint.active {
            display: inline-flex;
          }

          .parent-select-active [data-ticket-id] {
            transition: opacity 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          }

          .parent-select-source {
            opacity: 0.45;
          }

          .parent-select-disabled {
            opacity: 0.3;
          }

          .ticket-card.parent-select-candidate {
            border-color: var(--accent);
            box-shadow: inset 0 0 0 1px var(--accent);
          }

          .list-row.parent-select-candidate td {
            border-top: 1px solid var(--accent);
            border-bottom: 1px solid var(--accent);
            box-shadow: inset 0 0 0 1px var(--accent);
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
            .header-actions { align-items: flex-end; gap: 12px; }
            .stats { gap: 20px; }
            body { padding: 20px; }
          }

          @media (max-width: 800px) {
            body { padding: 12px; }
            .header-actions {
              width: auto;
              margin-left: auto;
              justify-content: flex-end;
              gap: 8px;
            }
            .header-nav-links {
              width: auto;
              gap: 6px;
            }
            .header-nav-links .nav-link {
              flex: 0 0 auto;
              min-width: 110px;
              padding-left: 12px;
              padding-right: 12px;
            }
            .view-switcher {
              width: auto;
            }
            .view-btn {
              flex: 0 0 auto;
              min-width: 110px;
              padding-left: 12px;
              padding-right: 12px;
            }
            .stats {
              margin-left: auto;
              justify-content: flex-end;
              gap: 12px;
              flex-wrap: nowrap;
            }
            .week-progress {
              grid-template-columns: repeat(26, minmax(0, 1fr));
              margin-bottom: 24px;
            }

            [data-view="list"] .list-view {
              border-collapse: separate;
              border-spacing: 0;
            }

            [data-view="list"] .list-view thead tr {
              display: grid;
              grid-template-columns: 96px minmax(0, 1fr);
              grid-template-areas: "id task";
              border-bottom: 2px solid var(--border-color);
            }

            [data-view="list"] .list-view thead th {
              border-bottom: none;
            }

            [data-view="list"] .list-view .list-col-id { grid-area: id; }
            [data-view="list"] .list-view .list-col-task { grid-area: task; }
            [data-view="list"] .list-view .list-col-meta-stack { display: none; }

            [data-view="list"] .list-view .list-col-status,
            [data-view="list"] .list-view .list-col-assignee,
            [data-view="list"] .list-view .list-col-date {
              display: none;
            }

            [data-view="list"] .list-view tbody .list-row {
              display: grid;
              grid-template-columns: 96px auto minmax(0, 1fr) auto;
              grid-template-areas:
                "id task task task"
                ". status assignee date";
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
              min-width: 0;
            }

            [data-view="list"] .list-view tbody .list-col-status {
              grid-area: status;
              display: flex;
              align-items: center;
              min-height: 34px;
              padding-top: 6px;
              padding-bottom: 6px;
              min-width: 0;
            }

            [data-view="list"] .list-view tbody .list-col-assignee {
              grid-area: assignee;
              display: flex;
              align-items: center;
              min-height: 34px;
              padding-top: 6px;
              padding-bottom: 6px;
              min-width: 0;
            }

            [data-view="list"] .list-view tbody .list-col-date {
              grid-area: date;
              display: flex;
              align-items: center;
              justify-content: flex-end;
              min-height: 34px;
              padding-top: 6px;
              padding-bottom: 6px;
              min-width: 0;
            }

            [data-view="list"] .list-view th,
            [data-view="list"] .list-view td {
              padding-left: 10px;
              padding-right: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container" id="mainContainer" data-view="board">
          <header>
            <div class="header-left project-context-trigger" onclick="openProjectContextModal()">
              <h1>PROJECT CONTEXT</h1>
              <p id="projectContextSummary">Click to set core context for AI</p>
            </div>
            <div class="header-actions">
              <div class="view-switcher">
                <button class="view-btn active" id="boardViewBtn" onclick="switchView('board')">Board</button>
                <button class="view-btn" id="listViewBtn" onclick="switchView('list')">List</button>
              </div>
              <div class="header-nav-links">
                <a class="nav-link" href="/stats">Stats</a>
                <a class="nav-link" href="/meetings">Meetings</a>
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
          <div class="week-progress" aria-label="52-week progress">${weeklyProgress}</div>

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
                <th style="width: 120px;" class="list-col-id">
                  <span class="status-filter-label" id="idColumnLabel" onclick="setListSort(event, 'id')">ID</span>
                </th>
                <th class="list-col-task">Task Description</th>
                <th style="width: 180px;" class="list-col-status status-column-trigger" id="statusColumnHeader">
                  <div class="status-filter-wrap">
                    <span class="status-filter-label" id="statusColumnLabel" onclick="toggleStatusFilter(event)">Status</span>
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
                </th>
                <th style="width: 180px;" class="list-col-assignee">
                  <div class="status-filter-wrap">
                    <span class="status-filter-label" id="assigneeColumnLabel" onclick="toggleAssigneeFilter(event)">Assignee</span>
                    <div class="status-filter-dropdown" id="assigneeFilterDropdown" onclick="event.stopPropagation()">
                      <div class="status-filter-title">Visible Assignee</div>
                      ${assigneeFilterNames.map((name) => `
                        <label class="status-filter-item">
                          <input type="checkbox" data-filter-assignee="${escapeHtml(toAssigneeKey(name))}" checked />
                          <span>${escapeHtml(name).toUpperCase()}</span>
                        </label>
                      `).join('')}
                      <div class="dropdown-group" style="margin-top: 10px; padding-top: 10px;">
                        <div class="status-filter-title" style="margin-bottom: 8px;">Sort</div>
                        <div class="filter-sort-actions">
                          <button type="button" class="filter-sort-btn" id="assigneeSortAscBtn" onclick="setAssigneeSort(event, 'asc')">Asc</button>
                          <button type="button" class="filter-sort-btn" id="assigneeSortDescBtn" onclick="setAssigneeSort(event, 'desc')">Desc</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </th>
                <th style="width: 100px;" class="list-col-date">
                  <span class="status-filter-label" id="dateColumnLabel" onclick="setListSort(event, 'date')">Date</span>
                </th>
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

        <div class="modal" id="projectContextModal" onclick="handleProjectContextBackdropClick(event)">
          <div class="modal-content" onclick="event.stopPropagation()">
            <h2 style="text-transform: uppercase; letter-spacing: 0.1em;">Project Context</h2>
            <p style="color: var(--text-secondary); font-size: 12px; margin-top: 10px; line-height: 1.5;">핵심 배경(목표, 제약, 도메인)을 입력하면 AI Spark Subtasks와 AI Meeting 추천에 함께 반영됩니다.</p>
            <textarea id="projectContextInput" rows="6" placeholder="예: B2B SaaS 온보딩 개선 프로젝트. 목표는 전환율 +15%. 제약: 2주 내 릴리즈, FE 리소스 1명."></textarea>
            <div style="display: flex; gap: 16px; justify-content: flex-end;">
              <button type="button" class="create-btn" style="background: var(--card-bg); color: white; border: 1px solid var(--border-color);" onclick="closeProjectContextModal()">Cancel</button>
              <button type="button" class="create-btn" onclick="saveProjectContext()">Save Context</button>
            </div>
          </div>
        </div>

        <div class="dropdown-menu" id="ticketContextMenu" onclick="event.stopPropagation()" style="position: fixed; left: 0; top: 0; right: auto; min-width: 280px; max-width: min(360px, calc(100vw - 24px)); z-index: 1300;"></div>
        <div class="parent-select-hint" id="parentSelectHint" onclick="event.stopPropagation()">
          <span id="parentSelectHintText">Select parent task</span>
          <button type="button" class="inline-btn" onclick="cancelParentSelection()">Cancel</button>
        </div>

        <script>
          let currentDropdown = null;
          let draggedTicketId = null;
          let draggedRow = null;
          let draggedPath = '';
          let createParentTicketId = null;
          let inlineEditState = null;
          let parentSelectionState = null;
          let isGeneratingAiSubtasks = false;
          const PROJECT_CONTEXT_STORAGE_KEY = 'projectCoreContext';
          const STATUS_FILTER_STORAGE_KEY = 'ticketStatusFilter';
          const ASSIGNEE_FILTER_STORAGE_KEY = 'ticketAssigneeFilter';
          const LIST_SORT_STORAGE_KEY = 'ticketListSort';
          let statusFilterState = {
            pending: true,
            in_progress: true,
            completed: true,
          };
          let assigneeFilterState = {};
          let listSortState = {
            key: 'assignee',
            order: 'asc'
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
            initializeProjectContext();
            initializeStatusFilter();
            initializeAssigneeFilter();
            initListDragAndDrop();
            document.addEventListener('click', handleParentSelectionClick, true);
          });

          function getProjectContext() {
            return (localStorage.getItem(PROJECT_CONTEXT_STORAGE_KEY) || '').trim();
          }

          function updateProjectContextSummary() {
            const summaryEl = document.getElementById('projectContextSummary');
            if (!summaryEl) return;
            const context = getProjectContext();
            if (!context) {
              summaryEl.textContent = 'Click to set core context for AI';
              return;
            }
            const compact = context.replace(/\s+/g, ' ').trim();
            summaryEl.textContent = compact.length > 80 ? compact.slice(0, 80) + '…' : compact;
          }

          function initializeProjectContext() {
            updateProjectContextSummary();
          }

          function openProjectContextModal() {
            closeContextMenu();
            const modal = document.getElementById('projectContextModal');
            const input = document.getElementById('projectContextInput');
            if (!modal || !input) return;
            input.value = getProjectContext();
            modal.classList.add('active');
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }

          function closeProjectContextModal() {
            const modal = document.getElementById('projectContextModal');
            if (!modal) return;
            modal.classList.remove('active');
          }

          function handleProjectContextBackdropClick(event) {
            event.stopPropagation();
            closeProjectContextModal();
          }

          function saveProjectContext() {
            const input = document.getElementById('projectContextInput');
            if (!input) return;
            localStorage.setItem(PROJECT_CONTEXT_STORAGE_KEY, input.value.trim().slice(0, 1500));
            updateProjectContextSummary();
            closeProjectContextModal();
          }

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
            const btn = document.getElementById('statusColumnLabel');
            if (!btn) return;
            const activeCount = Object.values(statusFilterState).filter(Boolean).length;
            btn.textContent = 'Status (' + activeCount + ')';
          }

          function applyCombinedFilters() {
            const items = document.querySelectorAll('[data-status][data-assignee-key]');
            items.forEach((el) => {
              const status = el.dataset.status;
              const assigneeKey = el.dataset.assigneeKey;
              const statusVisible = status ? Boolean(statusFilterState[status]) : true;
              const assigneeVisible = assigneeKey ? assigneeFilterState[assigneeKey] !== false : true;
              el.style.display = statusVisible && assigneeVisible ? '' : 'none';
            });
          }

          function applyStatusFilter() {
            applyCombinedFilters();
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

          function toggleAssigneeFilter(event) {
            event.stopPropagation();
            const dropdown = document.getElementById('assigneeFilterDropdown');
            if (!dropdown) return;
            dropdown.classList.toggle('active');
          }

          function loadAssigneeFilterState() {
            const checkboxes = Array.from(document.querySelectorAll('input[data-filter-assignee]'));
            const allKeys = checkboxes
              .map((input) => input.dataset.filterAssignee)
              .filter((key) => Boolean(key));
            let parsed = {};
            try {
              const raw = localStorage.getItem(ASSIGNEE_FILTER_STORAGE_KEY);
              if (raw) parsed = JSON.parse(raw);
            } catch {
              parsed = {};
            }
            assigneeFilterState = {};
            allKeys.forEach((key) => {
              if (!key) return;
              assigneeFilterState[key] = parsed[key] !== false;
            });
          }

          function saveAssigneeFilterState() {
            localStorage.setItem(ASSIGNEE_FILTER_STORAGE_KEY, JSON.stringify(assigneeFilterState));
          }

          function loadListSortState() {
            try {
              const raw = localStorage.getItem(LIST_SORT_STORAGE_KEY);
              if (!raw) return;
              const parsed = JSON.parse(raw);
              const key = parsed && typeof parsed.key === 'string' ? parsed.key : 'assignee';
              const order = parsed && parsed.order === 'desc' ? 'desc' : 'asc';
              if (key === 'id' || key === 'date' || key === 'assignee') {
                listSortState = { key, order };
              }
            } catch {
              listSortState = { key: 'assignee', order: 'asc' };
            }
          }

          function saveListSortState() {
            localStorage.setItem(LIST_SORT_STORAGE_KEY, JSON.stringify(listSortState));
          }

          function updateAssigneeFilterButtonLabel() {
            const btn = document.getElementById('assigneeColumnLabel');
            if (!btn) return;
            const activeCount = Object.values(assigneeFilterState).filter(Boolean).length;
            btn.textContent = 'Assignee (' + activeCount + ')';
          }

          function updateAssigneeSortButtons() {
            const ascBtn = document.getElementById('assigneeSortAscBtn');
            const descBtn = document.getElementById('assigneeSortDescBtn');
            if (!ascBtn || !descBtn) return;
            const isAssigneeSort = listSortState.key === 'assignee';
            ascBtn.classList.toggle('active', isAssigneeSort && listSortState.order === 'asc');
            descBtn.classList.toggle('active', isAssigneeSort && listSortState.order === 'desc');
          }

          function updateListSortHeaderLabels() {
            const idLabel = document.getElementById('idColumnLabel');
            const dateLabel = document.getElementById('dateColumnLabel');
            if (idLabel) {
              if (listSortState.key === 'id') {
                idLabel.textContent = listSortState.order === 'asc' ? 'ID ↑' : 'ID ↓';
              } else {
                idLabel.textContent = 'ID';
              }
            }
            if (dateLabel) {
              if (listSortState.key === 'date') {
                dateLabel.textContent = listSortState.order === 'asc' ? 'Date ↑' : 'Date ↓';
              } else {
                dateLabel.textContent = 'Date';
              }
            }
          }

          function applyListSort() {
            const tbody = document.querySelector('.list-view tbody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('.list-row'));
            const factor = listSortState.order === 'desc' ? -1 : 1;
            rows.sort((a, b) => {
              if (listSortState.key === 'id') {
                const aId = Number(a.dataset.ticketId || 0);
                const bId = Number(b.dataset.ticketId || 0);
                if (aId !== bId) return (aId - bId) * factor;
              } else if (listSortState.key === 'date') {
                const aTs = Number(a.dataset.createdAtTs || 0);
                const bTs = Number(b.dataset.createdAtTs || 0);
                if (aTs !== bTs) return (aTs - bTs) * factor;
              } else {
                const aName = (a.dataset.assigneeName || '').toLowerCase();
                const bName = (b.dataset.assigneeName || '').toLowerCase();
                const compare = aName.localeCompare(bName);
                if (compare !== 0) return compare * factor;
              }
              const aPath = a.dataset.path || '';
              const bPath = b.dataset.path || '';
              return aPath.localeCompare(bPath);
            });
            rows.forEach((row) => tbody.appendChild(row));
            updateListSortHeaderLabels();
            updateAssigneeSortButtons();
          }

          function applyAssigneeFilter() {
            applyCombinedFilters();
            updateAssigneeFilterButtonLabel();
            applyListSort();
          }

          function setAssigneeSort(event, order) {
            event.stopPropagation();
            listSortState = {
              key: 'assignee',
              order: order === 'desc' ? 'desc' : 'asc'
            };
            saveListSortState();
            applyListSort();
          }

          function setListSort(event, key) {
            event.stopPropagation();
            if (key !== 'id' && key !== 'date') return;
            if (listSortState.key === key) {
              listSortState.order = listSortState.order === 'asc' ? 'desc' : 'asc';
            } else {
              listSortState.key = key;
              listSortState.order = 'asc';
            }
            saveListSortState();
            applyListSort();
          }

          function initializeAssigneeFilter() {
            loadAssigneeFilterState();
            loadListSortState();
            const checkboxes = document.querySelectorAll('input[data-filter-assignee]');
            checkboxes.forEach((input) => {
              const assigneeKey = input.dataset.filterAssignee;
              if (!assigneeKey) return;
              input.checked = assigneeFilterState[assigneeKey] !== false;
              input.addEventListener('change', () => {
                assigneeFilterState[assigneeKey] = input.checked;
                const activeCount = Object.values(assigneeFilterState).filter(Boolean).length;
                if (activeCount === 0) {
                  assigneeFilterState[assigneeKey] = true;
                  input.checked = true;
                  return;
                }
                saveAssigneeFilterState();
                applyAssigneeFilter();
              });
            });
            applyAssigneeFilter();
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

          function positionMenuNearPointer(menu, clientX, clientY) {
            const margin = 12;
            menu.style.left = String(clientX) + 'px';
            menu.style.top = String(clientY) + 'px';

            const rect = menu.getBoundingClientRect();
            let nextLeft = clientX;
            let nextTop = clientY;

            if (rect.right > window.innerWidth - margin) {
              nextLeft = Math.max(margin, window.innerWidth - rect.width - margin);
            }
            if (rect.bottom > window.innerHeight - margin) {
              nextTop = Math.max(margin, window.innerHeight - rect.height - margin);
            }

            menu.style.left = String(nextLeft) + 'px';
            menu.style.top = String(nextTop) + 'px';
          }

          function openTicketContextMenu(event, ticketId, _currentDesc) {
            if (parentSelectionState) return;
            event.stopPropagation();
            const menu = document.getElementById('ticketContextMenu');
            if (!menu) return;

            if (currentDropdown && currentDropdown !== menu) {
              currentDropdown.classList.remove('active');
            }

            menu.dataset.ticketId = String(ticketId);
            menu.innerHTML = \`
              <div class="dropdown-item" onclick="startInlineTaskEdit(event, \${ticketId})">Edit Description</div>
              <div class="dropdown-group">
                <div class="dropdown-item" onclick="openCreateModal(\${ticketId})">└ Add Subtask</div>
                <div class="dropdown-item" onclick="toggleAiSubtasksPanel(event, \${ticketId})">
                  <span class="dropdown-item-leading">
                    <svg class="sparkles-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
                      <path d="M20 2v4"></path>
                      <path d="M22 4h-4"></path>
                      <circle cx="4" cy="20" r="2"></circle>
                    </svg>
                    Spark Subtasks
                  </span>
                </div>
                <div class="dropdown-inline-panel" id="aiSubtaskPanel-\${ticketId}" onclick="event.stopPropagation()">
                  <textarea
                    class="dropdown-inline-textarea"
                    id="aiSubtaskContext-\${ticketId}"
                    placeholder="추가 지시사항 (선택)"
                  ></textarea>
                  <div class="dropdown-inline-actions">
                    <span class="dropdown-inline-hint">AI가 5개를 생성합니다</span>
                    <button type="button" class="inline-btn primary" onclick="submitAiSubtasks(event, \${ticketId})">Generate 5</button>
                  </div>
                  <div class="dropdown-inline-status" id="aiSubtaskStatus-\${ticketId}"></div>
                </div>
                <div class="dropdown-item" onclick="selectParentTicket(\${ticketId})">Choose Parent Task ┓</div>
              </div>
              <div class="dropdown-group">
                <div class="dropdown-item" onclick="moveToTopLevel(\${ticketId})">Move to Top-Level</div>
              </div>
              <div class="dropdown-group">
                <div class="dropdown-item danger" onclick="deleteTicket(\${ticketId})">Delete Task</div>
              </div>
            \`;

            menu.classList.add('active');
            currentDropdown = menu;
            positionMenuNearPointer(menu, event.clientX, event.clientY);
          }

          function closeContextMenu() {
            if (currentDropdown) {
              currentDropdown.classList.remove('active');
              currentDropdown = null;
            }
          }

          function getAllTicketElements() {
            return Array.from(document.querySelectorAll('[data-ticket-id]'));
          }

          function updateParentSelectionVisuals() {
            const allEls = getAllTicketElements();
            allEls.forEach((el) => {
              el.classList.remove('parent-select-source', 'parent-select-candidate', 'parent-select-disabled');
            });

            if (!parentSelectionState) {
              document.body.classList.remove('parent-select-active');
              const hint = document.getElementById('parentSelectHint');
              if (hint) hint.classList.remove('active');
              return;
            }

            document.body.classList.add('parent-select-active');
            allEls.forEach((el) => {
              const ticketId = Number(el.dataset.ticketId);
              if (!Number.isInteger(ticketId)) return;
              if (ticketId === parentSelectionState.sourceId) {
                el.classList.add('parent-select-source');
                return;
              }
              if (parentSelectionState.candidateIds.has(ticketId)) {
                el.classList.add('parent-select-candidate');
                return;
              }
              el.classList.add('parent-select-disabled');
            });

            const hint = document.getElementById('parentSelectHint');
            const hintText = document.getElementById('parentSelectHintText');
            if (hintText) {
              hintText.textContent = 'Choose parent task by clicking one of the highlighted items';
            }
            if (hint) hint.classList.add('active');
          }

          function cancelParentSelection() {
            parentSelectionState = null;
            updateParentSelectionVisuals();
          }

          async function handleParentSelectionClick(event) {
            if (!parentSelectionState || parentSelectionState.isSubmitting) return;
            const target = event.target;
            if (!(target instanceof Element)) return;

            if (target.closest('#parentSelectHint')) return;

            const ticketEl = target.closest('[data-ticket-id]');
            if (!ticketEl) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }

            const selectedId = Number(ticketEl.dataset.ticketId);
            if (!Number.isInteger(selectedId)) return;

            event.preventDefault();
            event.stopPropagation();

            if (!parentSelectionState.candidateIds.has(selectedId)) {
              return;
            }

            parentSelectionState.isSubmitting = true;
            await updateHierarchy(parentSelectionState.sourceId, selectedId);
          }

          function findVisibleTaskDesc(ticketId) {
            const candidates = Array.from(document.querySelectorAll('[data-task-desc-id="' + ticketId + '"]'));
            if (!candidates.length) return null;
            const visible = candidates.find((el) => el.offsetParent !== null);
            return visible || candidates[0];
          }

          function closeInlineTaskEdit(keepContextMenu = false) {
            if (!inlineEditState) return;
            const { targetEl, editorEl } = inlineEditState;
            if (editorEl && editorEl.parentNode) {
              editorEl.parentNode.removeChild(editorEl);
            }
            if (targetEl) {
              targetEl.style.display = '';
            }
            inlineEditState = null;
            if (!keepContextMenu) {
              closeContextMenu();
            }
          }

          async function saveInlineTaskEdit(ticketId) {
            if (!inlineEditState) return;
            const input = inlineEditState.editorEl.querySelector('textarea');
            if (!input) return;
            const description = input.value.trim();
            if (!description) {
              alert('업무 내용을 입력해주세요');
              input.focus();
              return;
            }

            const response = await fetch(\`/api/tickets/\${ticketId}/description\`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ description })
            });

            if (!response.ok) {
              const data = await response.json().catch(() => ({ error: '업무 내용 변경 실패' }));
              alert(data.error || '업무 내용 변경 실패');
              return;
            }

            document.querySelectorAll('[data-task-desc-id="' + ticketId + '"]').forEach((el) => {
              el.textContent = description;
            });
            closeInlineTaskEdit();
          }

          function startInlineTaskEdit(event, ticketId) {
            event.stopPropagation();
            closeContextMenu();
            closeInlineTaskEdit(true);

            const targetEl = findVisibleTaskDesc(ticketId);
            if (!targetEl || !targetEl.parentNode) return;

            const originalText = (targetEl.textContent || '').trim();
            targetEl.style.display = 'none';

            const editor = document.createElement('div');
            editor.className = 'task-desc-inline-edit';
            editor.innerHTML = \`
              <textarea rows="3"></textarea>
              <div class="task-desc-inline-actions">
                <button type="button" class="inline-btn" data-action="cancel">Cancel</button>
                <button type="button" class="inline-btn primary" data-action="save">Save</button>
              </div>
            \`;
            const textarea = editor.querySelector('textarea');
            if (textarea) {
              textarea.value = originalText;
            }

            editor.addEventListener('click', (evt) => evt.stopPropagation());
            editor.addEventListener('keydown', (evt) => {
              if (evt.key === 'Escape') {
                evt.preventDefault();
                closeInlineTaskEdit();
                return;
              }
              if (evt.key === 'Enter' && (evt.ctrlKey || evt.metaKey)) {
                evt.preventDefault();
                saveInlineTaskEdit(ticketId);
              }
            });

            const cancelBtn = editor.querySelector('[data-action="cancel"]');
            const saveBtn = editor.querySelector('[data-action="save"]');
            if (cancelBtn) {
              cancelBtn.addEventListener('click', (evt) => {
                evt.preventDefault();
                closeInlineTaskEdit();
              });
            }
            if (saveBtn) {
              saveBtn.addEventListener('click', (evt) => {
                evt.preventDefault();
                saveInlineTaskEdit(ticketId);
              });
            }

            targetEl.parentNode.insertBefore(editor, targetEl.nextSibling);
            inlineEditState = { ticketId, targetEl, editorEl: editor };

            if (textarea) {
              textarea.focus();
              textarea.setSelectionRange(textarea.value.length, textarea.value.length);
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

          async function updateHierarchy(ticketId, parentTicketId) {
            const response = await fetch(\`/api/tickets/\${ticketId}/hierarchy\`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ parent_ticket_id: parentTicketId })
            });
            if (response.ok) {
              window.location.reload();
              return;
            }
            const data = await response.json().catch(() => ({ error: '계층 변경 실패' }));
            if (parentSelectionState) {
              parentSelectionState.isSubmitting = false;
            }
            alert(data.error || '계층 변경 실패');
          }

          async function moveToTopLevel(ticketId) {
            closeContextMenu();
            await updateHierarchy(ticketId, null);
          }

          function getCurrentTicketPath(ticketId) {
            const row = document.querySelector('.list-row[data-ticket-id="' + ticketId + '"]');
            return row ? (row.dataset.path || '') : '';
          }

          function getSelectableParentCandidates(ticketId) {
            const rows = Array.from(document.querySelectorAll('.list-row[data-ticket-id]'));
            const currentPath = getCurrentTicketPath(ticketId);

            return rows
              .map((row) => {
                const id = Number(row.dataset.ticketId);
                const path = row.dataset.path || '';
                const idCell = row.querySelector('.list-col-id');
                const desc = row.querySelector('[data-task-desc-id="' + id + '"]');
                return {
                  id,
                  path,
                  label: ((idCell ? idCell.textContent : '') || '').trim(),
                  description: ((desc ? desc.textContent : '') || '').trim()
                };
              })
              .filter((item) => Number.isInteger(item.id))
              .filter((item) => item.id !== ticketId)
              .filter((item) => !isDescendantPath(item.path, currentPath));
          }

          async function selectParentTicket(ticketId) {
            closeContextMenu();
            closeInlineTaskEdit(true);
            const candidates = getSelectableParentCandidates(ticketId);
            if (!candidates.length) {
              alert('선택 가능한 상위 티켓이 없습니다.');
              return;
            }
            parentSelectionState = {
              sourceId: ticketId,
              candidateIds: new Set(candidates.map((item) => item.id)),
              isSubmitting: false,
            };
            updateParentSelectionVisuals();
          }

          function toClientAssigneeKey(name) {
            return String(name || 'unassigned')
              .trim()
              .toLowerCase()
              .replace(/\s+/g, '_');
          }

          function sortAssigneeMenuOptions(menu) {
            const group = menu.querySelector('.dropdown-group');
            const items = Array.from(menu.querySelectorAll('.dropdown-item[data-user-id]'));
            items.sort((a, b) => {
              const aName = (a.dataset.userName || '').trim();
              const bName = (b.dataset.userName || '').trim();
              return aName.localeCompare(bName, 'ko', { sensitivity: 'base' });
            });
            items.forEach((item) => menu.insertBefore(item, group || null));
          }

          function appendAssigneeOptionToMenus(userId, userName) {
            if (!userId || !userName) return;
            const menus = document.querySelectorAll('.assignee-menu[data-ticket-id]');
            menus.forEach((menu) => {
              const ticketId = Number(menu.dataset.ticketId);
              if (!Number.isInteger(ticketId)) return;
              const exists = Array.from(menu.querySelectorAll('.dropdown-item[data-user-id]'))
                .some((el) => el.dataset.userId === userId);
              if (exists) return;

              const item = document.createElement('div');
              item.className = 'dropdown-item';
              item.dataset.ticketId = String(ticketId);
              item.dataset.userId = userId;
              item.dataset.userName = userName;
              item.textContent = userName;
              item.setAttribute('onclick', 'updateAssigneeFromDataset(event)');

              const group = menu.querySelector('.dropdown-group');
              menu.insertBefore(item, group || null);
              sortAssigneeMenuOptions(menu);
            });
          }

          function applyAssigneeToTicket(ticketId, assigneeName) {
            const normalizedName = String(assigneeName || '').trim();
            if (!normalizedName) return;
            const assigneeKey = toClientAssigneeKey(normalizedName);

            const card = document.querySelector('.ticket-card[data-ticket-id="' + ticketId + '"]');
            if (card) {
              card.dataset.assigneeKey = assigneeKey;
            }
            const row = document.querySelector('.list-row[data-ticket-id="' + ticketId + '"]');
            if (row) {
              row.dataset.assigneeKey = assigneeKey;
              row.dataset.assigneeName = normalizedName;
            }

            const assigneeAreas = document.querySelectorAll('[data-ticket-id="' + ticketId + '"] .assignee');
            assigneeAreas.forEach((area) => {
              const box = area.querySelector('.assignee-box');
              if (box) box.textContent = normalizedName.charAt(0).toUpperCase();
              const label = area.querySelector('span');
              if (label) label.textContent = normalizedName.toUpperCase();
            });

            applyCombinedFilters();
            applyListSort();
          }

          async function updateAssignee(ticketId, userId, userName) {
            const response = await fetch(\`/api/tickets/\${ticketId}/assignee\`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ assignee_id: userId, assignee_name: userName })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) return;
            const nextAssigneeId = String(data.assignee_id || userId || '').trim();
            const nextAssigneeName = String(data.assignee_name || userName || '').trim();
            appendAssigneeOptionToMenus(nextAssigneeId, nextAssigneeName);
            applyAssigneeToTicket(ticketId, nextAssigneeName);
          }

          async function updateAssigneeFromDataset(event) {
            event.stopPropagation();
            const target = event.currentTarget;
            if (!(target instanceof HTMLElement)) return;
            const ticketId = Number(target.dataset.ticketId);
            const userId = target.dataset.userId || '';
            const userName = target.dataset.userName || '';
            if (!Number.isInteger(ticketId) || !userId || !userName) return;
            await updateAssignee(ticketId, userId, userName);
          }

          function toggleAssigneeCreatePanel(event, panelKey) {
            event.stopPropagation();
            const panel = document.getElementById('assigneeCreatePanel-' + panelKey);
            const status = document.getElementById('assigneeCreateStatus-' + panelKey);
            if (!panel) return;
            panel.classList.toggle('active');
            if (status) status.textContent = '';
            if (!panel.classList.contains('active')) return;
            const input = document.getElementById('assigneeCreateInput-' + panelKey);
            if (!(input instanceof HTMLInputElement)) return;
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }

          function setAssigneeCreateStatus(panelKey, message) {
            const status = document.getElementById('assigneeCreateStatus-' + panelKey);
            if (status) status.textContent = message;
          }

          async function submitCustomAssignee(event, ticketId, panelKey) {
            event.stopPropagation();
            const input = document.getElementById('assigneeCreateInput-' + panelKey);
            if (!(input instanceof HTMLInputElement)) return;
            const assigneeName = input.value.trim();
            if (!assigneeName) {
              setAssigneeCreateStatus(panelKey, 'Name is required');
              input.focus();
              return;
            }

            setAssigneeCreateStatus(panelKey, 'Saving...');
            const response = await fetch('/api/tickets/' + ticketId + '/assignee', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ assignee_name: assigneeName, create_user: true })
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
              const nextAssigneeId = String(data.assignee_id || '').trim();
              const nextAssigneeName = String(data.assignee_name || assigneeName).trim();
              appendAssigneeOptionToMenus(nextAssigneeId, nextAssigneeName);
              applyAssigneeToTicket(ticketId, nextAssigneeName);
              input.value = '';
              setAssigneeCreateStatus(panelKey, 'Saved');
              return;
            }
            setAssigneeCreateStatus(panelKey, data.error || 'Save failed');
          }

          async function deleteTicket(ticketId) {
            if (!confirm('Are you sure you want to delete this task?')) return;
            const response = await fetch(\`/api/tickets/\${ticketId}\`, {
              method: 'DELETE'
            });
            if (response.ok) window.location.reload();
          }

          function openCreateModal(parentTicketId = null) {
            createParentTicketId = Number.isInteger(parentTicketId) ? parentTicketId : null;
            closeContextMenu();
            const modal = document.getElementById('createModal');
            if (!modal) return;
            const heading = modal.querySelector('h2');
            if (heading) {
              heading.textContent = createParentTicketId ? 'Create Subtask' : 'Create Task';
            }
            modal.classList.add('active');
          }

          function closeCreateModal() {
            createParentTicketId = null;
            const modal = document.getElementById('createModal');
            if (!modal) return;
            modal.classList.remove('active');
          }

          function setAiSubtaskStatus(ticketId, message) {
            const statusEl = document.getElementById('aiSubtaskStatus-' + ticketId);
            if (statusEl) statusEl.textContent = message;
          }

          function toggleAiSubtasksPanel(event, ticketId) {
            event.stopPropagation();
            const panel = document.getElementById('aiSubtaskPanel-' + ticketId);
            if (!panel) return;
            panel.classList.toggle('active');
            setAiSubtaskStatus(ticketId, '');
            if (!panel.classList.contains('active')) return;
            const input = document.getElementById('aiSubtaskContext-' + ticketId);
            if (input) input.focus();
          }

          async function submitAiSubtasks(event, ticketId) {
            event.stopPropagation();
            if (isGeneratingAiSubtasks) return;

            const input = document.getElementById('aiSubtaskContext-' + ticketId);
            const extraContext = input ? input.value.trim() : '';
            isGeneratingAiSubtasks = true;
            document.body.style.cursor = 'wait';
            setAiSubtaskStatus(ticketId, 'Generating...');

            try {
              const response = await fetch(\`/api/tickets/\${ticketId}/ai-subtasks\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  count: 5,
                  extra_context: extraContext,
                  project_context: getProjectContext()
                })
              });

              const data = await response.json().catch(() => ({}));
              if (!response.ok) {
                setAiSubtaskStatus(ticketId, data.error || '생성 실패');
                return;
              }

              const createdCount = Number(data.created_count || 0);
              if (!createdCount) {
                setAiSubtaskStatus(ticketId, '생성된 subtask가 없습니다');
                return;
              }

              setAiSubtaskStatus(ticketId, '생성 완료. 새로고침합니다...');
              window.location.reload();
            } catch (_error) {
              setAiSubtaskStatus(ticketId, '생성 중 오류가 발생했습니다');
            } finally {
              isGeneratingAiSubtasks = false;
              document.body.style.cursor = '';
            }
          }

          async function createTicket(event) {
            event.preventDefault();
            const description = event.target.ticketDescription.value;
            const response = await fetch('/api/tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                description,
                parent_ticket_id: createParentTicketId
              })
            });
            if (response.ok) window.location.reload();
          }

          document.addEventListener('click', () => {
            closeContextMenu();
            closeInlineTaskEdit(true);
            const statusDropdown = document.getElementById('statusFilterDropdown');
            if (statusDropdown) {
              statusDropdown.classList.remove('active');
            }
            const assigneeDropdown = document.getElementById('assigneeFilterDropdown');
            if (assigneeDropdown) {
              assigneeDropdown.classList.remove('active');
            }
          });

          document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;

            const createModal = document.getElementById('createModal');
            const projectContextModal = document.getElementById('projectContextModal');

            if (createModal && createModal.classList.contains('active')) {
              closeCreateModal();
            }
            if (projectContextModal && projectContextModal.classList.contains('active')) {
              closeProjectContextModal();
            }
            if (parentSelectionState) {
              cancelParentSelection();
              return;
            }
            closeContextMenu();
            closeInlineTaskEdit(true);
          });
        </script>
        ${renderFloatingAuthButton()}
      </body>
    </html>
  `;
}

function renderColumnCards(tickets: TicketItem[], status: string, users: UserItem[]): string {
  return tickets
    .filter(t => t.status === status)
    .map(t => {
      const escapeDesc = escapeHtml(t.ticket_description).replace(/'/g, "\\'");
      const assigneeName = t.assignee_name || t.user_name || 'Unassigned';
      const assigneeKey = toAssigneeKey(assigneeName);
      return `
        <div class="ticket-card" data-status="${t.status}" data-assignee-key="${escapeHtml(assigneeKey)}" data-ticket-id="${t.id}" onclick="openTicketContextMenu(event, ${t.id}, '${escapeDesc}')">
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
          <div class="ticket-desc" data-task-desc-id="${t.id}" onclick="event.stopPropagation()">${escapeHtml(t.ticket_description)}</div>
          
          <div class="card-footer">
            <div style="position: relative;">
              <div class="assignee" onclick="toggleDropdown(event)">
                <div class="assignee-box">${(t.assignee_name || t.user_name || 'U').charAt(0)}</div>
                <span>${escapeHtml(t.assignee_name || t.user_name || 'USER').toUpperCase()}</span>
              </div>
              <div class="dropdown-menu assignee-menu" data-ticket-id="${t.id}" style="top: auto; bottom: 24px; left: 0;">
                ${renderAssigneeMenuItems(t.id, users, 'board')}
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
  const assigneeName = t.assignee_name || t.user_name || 'Unassigned';
  const assigneeKey = toAssigneeKey(assigneeName);
  const createdAtTs = new Date(t.created_at).getTime();

  return `
    <tr class="list-row" draggable="true" data-ticket-id="${t.id}" data-path="${path.join('.')}" data-status="${t.status}" data-assignee-key="${escapeHtml(assigneeKey)}" data-assignee-name="${escapeHtml(assigneeName)}" data-created-at-ts="${Number.isFinite(createdAtTs) ? createdAtTs : 0}">
      <td class="list-col-id" style="font-weight: 700; color: var(--text-secondary); font-size: 11px; letter-spacing: 0.05em;">
        ${escapeHtml(t.ticket_title)}
      </td>
      <td class="list-col-task">
        <div class="task-cell" style="padding-left: ${leftIndent}px;">
          <span class="task-branch">${branchMark}</span>
          <span data-task-desc-id="${t.id}" style="cursor: pointer;" onclick="openTicketContextMenu(event, ${t.id}, '${escapeDesc}')">${escapeHtml(t.ticket_description)}</span>
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
          <div class="dropdown-menu assignee-menu" data-ticket-id="${t.id}" style="left: 0; right: auto;">
            ${renderAssigneeMenuItems(t.id, users, 'list')}
          </div>
        </div>
      </td>
      <td class="list-col-date" style="color: var(--text-secondary); font-size: 11px; font-weight: 600;">${formatDate(t.created_at)}</td>
    </tr>
  `;
}

function renderAssigneeMenuItems(ticketId: number, users: UserItem[], viewKey: 'board' | 'list'): string {
  const panelKey = `${viewKey}-${ticketId}`;
  return `
    ${users.map((u) => `
      <div
        class="dropdown-item"
        data-ticket-id="${ticketId}"
        data-user-id="${escapeHtml(u.user_id)}"
        data-user-name="${escapeHtml(u.user_name)}"
        onclick="updateAssigneeFromDataset(event)"
      >${escapeHtml(u.user_name)}</div>
    `).join('')}
    <div class="dropdown-group">
      <div class="dropdown-item" onclick="toggleAssigneeCreatePanel(event, '${panelKey}')">+ Add Assignee</div>
      <div class="dropdown-inline-panel" id="assigneeCreatePanel-${panelKey}" onclick="event.stopPropagation()">
        <input
          id="assigneeCreateInput-${panelKey}"
          class="dropdown-inline-input"
          type="text"
          placeholder="ASSIGNEE NAME"
          maxlength="80"
        />
        <div class="dropdown-inline-actions">
          <span class="dropdown-inline-hint">Stored to DB for reuse</span>
          <button type="button" class="inline-btn primary" onclick="submitCustomAssignee(event, ${ticketId}, '${panelKey}')">Save</button>
        </div>
        <div class="dropdown-inline-status" id="assigneeCreateStatus-${panelKey}"></div>
      </div>
    </div>
  `;
}

function getIsoWeekInfo(date: Date): { week: number; year: number } {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week: Math.min(week, 52), year: isoYear };
}

function renderWeekProgress(tickets: TicketItem[]): string {
  const nowInfo = getIsoWeekInfo(new Date());
  const createdByWeek = new Map<number, number>();
  const completedByWeek = new Map<number, number>();

  for (const ticket of tickets) {
    const createdInfo = getIsoWeekInfo(new Date(ticket.created_at));
    if (createdInfo.year === nowInfo.year) {
      createdByWeek.set(createdInfo.week, (createdByWeek.get(createdInfo.week) || 0) + 1);
    }

    if (ticket.completed_at) {
      const completedInfo = getIsoWeekInfo(new Date(ticket.completed_at));
      if (completedInfo.year === nowInfo.year) {
        completedByWeek.set(completedInfo.week, (completedByWeek.get(completedInfo.week) || 0) + 1);
      }
    }
  }

  const cells: string[] = [];
  for (let week = 1; week <= 52; week += 1) {
    const createdCount = createdByWeek.get(week) || 0;
    const completedCount = completedByWeek.get(week) || 0;
    const tooltip = `${nowInfo.year}년 ${week}주차 | 생성 ${createdCount} | 완료 ${completedCount}`;
    const filled = week <= nowInfo.week;
    cells.push(
      `<span class="week-cell ${filled ? 'filled' : 'empty'}" title="${escapeHtml(tooltip)}" aria-label="${escapeHtml(tooltip)}">${filled ? '■' : '□'}</span>`
    );
  }

  return cells.join('');
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

function toAssigneeKey(name: string): string {
  return String(name || 'unassigned')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
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
