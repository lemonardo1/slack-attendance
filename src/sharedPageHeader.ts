export const sharedPageHeaderStyles = `
  .page-top-link {
    margin-bottom: 12px;
  }
  .page-back-link {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    color: var(--text-secondary, var(--sub));
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    transition: color 0.2s;
  }
  .page-back-link:hover {
    color: var(--text-primary, var(--text));
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 2px solid var(--text-primary, var(--accent));
  }
  .page-title {
    font-size: 32px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: -0.02em;
  }
  .page-subtitle {
    margin-top: 6px;
    color: var(--text-secondary, var(--sub));
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .page-header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: flex-start;
    }
    .page-title {
      font-size: 24px;
    }
    .page-header-actions {
      width: 100%;
      justify-content: flex-start;
    }
  }
`;

export function renderBackToBoardLink(): string {
  return `
    <div class="page-top-link">
      <a class="page-back-link" href="/">← 티켓 보드로</a>
    </div>
  `;
}

export function renderFloatingAuthButton(): string {
  return `
    <button
      id="floatingAuthButton"
      class="floating-auth-btn"
      type="button"
      aria-label="로그인"
      title="로그인"
    >LOGIN</button>
    <script>
      (function initFloatingAuthButton() {
        const button = document.getElementById('floatingAuthButton');
        if (!button) return;

        function sanitizeInitials(raw) {
          const text = String(raw || '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 2);
          return text || 'ME';
        }

        async function loadSessionState() {
          try {
            const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
            if (!response.ok) throw new Error('failed');
            const data = await response.json();
            if (data && data.authenticated) {
              button.textContent = sanitizeInitials(data.initials);
              button.setAttribute('aria-label', '로그인됨: 통계 페이지 이동');
              button.setAttribute('title', '로그인됨: 통계 페이지 이동');
              button.dataset.authenticated = 'true';
              return;
            }
          } catch (_) {
            // Keep default unauthenticated UI.
          }
          button.textContent = 'LOGIN';
          button.setAttribute('aria-label', '로그인');
          button.setAttribute('title', '로그인');
          button.dataset.authenticated = 'false';
        }

        button.addEventListener('click', () => {
          if (button.dataset.authenticated === 'true') {
            window.location.href = '/stats';
            return;
          }
          window.location.href = '/stats/auth/google';
        });

        loadSessionState();
      })();
    </script>
  `;
}

export const floatingAuthButtonStyles = `
  .floating-auth-btn {
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 52px;
    height: 52px;
    border: 1px solid var(--border-color, #222222);
    background: var(--panel, #111111);
    color: var(--text-primary, #ffffff);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    cursor: pointer;
    z-index: 2000;
    transition: border-color 0.2s ease, color 0.2s ease;
  }
  .floating-auth-btn:hover {
    border-color: var(--text-primary, #ffffff);
  }
  @media (max-width: 768px) {
    .floating-auth-btn {
      right: 14px;
      bottom: 14px;
      width: 48px;
      height: 48px;
      font-size: 13px;
    }
  }
`;

