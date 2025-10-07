# Slack 출퇴근 체크 봇

Cloudflare Workers + D1 Database를 사용한 Slack 출퇴근 관리 봇입니다.

## 기능

- `/in` - 출근 체크
- `/out` - 퇴근 체크
- 웹 대시보드에서 최근 출퇴근 기록 확인

## 특징

- 서버리스 아키텍처 (Cloudflare Workers)
- D1 데이터베이스로 출퇴근 기록 저장
- Slack 서명 검증을 통한 보안
- 실시간 출퇴근 알림

## 설치 방법

### 1. 프로젝트 의존성 설치

```bash
npm install
```

### 2. D1 데이터베이스 마이그레이션

로컬 개발:
```bash
npm run seedLocalD1
```

프로덕션 배포:
```bash
npx wrangler d1 migrations apply DB --remote
```

### 3. Slack 앱 설정

1. [Slack API](https://api.slack.com/apps)에서 새 앱 생성
2. **Slash Commands** 설정:
   - `/in` 커맨드 생성
     - Request URL: `https://slack-attendance.lemonaatree.workers.dev//slack/command`
   - `/out` 커맨드 생성
     - Request URL: `https://slack-attendance.lemonaatree.workers.dev//slack/command`
3. **Basic Information**에서 `Signing Secret` 복사
4. **OAuth & Permissions**에서 다음 스코프 추가:
   - `commands` - Slash Commands 사용
   - `chat:write` - 메시지 전송

### 4. 환경 변수 설정

`wrangler.json`에서 `SLACK_SIGNING_SECRET` 설정:

```json
{
  "vars": {
    "SLACK_SIGNING_SECRET": "your_signing_secret_here"
  }
}
```

또는 Cloudflare Dashboard에서 환경 변수로 설정할 수 있습니다.

### 5. 배포

```bash
npm run deploy
```

배포 후 Slack 앱의 Request URL을 업데이트하세요:
- `https://your-worker.workers.dev/slack/command`

### 6. Slack 워크스페이스에 앱 설치

1. Slack 앱 설정 페이지에서 **Install App** 클릭
2. 워크스페이스에 권한 부여

## 사용 방법

Slack 채널에서:
- `/in` - 출근 체크
- `/out` - 퇴근 체크

웹 브라우저에서:
- `https://your-worker.workers.dev/` - 최근 출퇴근 기록 확인

## 개발

로컬 개발 서버 실행:
```bash
npm run dev
```

타입 체크:
```bash
npm run check
```

## 데이터베이스 스키마

```sql
CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('in', 'out')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
