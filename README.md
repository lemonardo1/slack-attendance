# Slack 출퇴근 체크 봇

Cloudflare Workers + D1 Database를 사용한 Slack 출퇴근 관리 봇입니다.

## 기능

- `/in` - 출근 체크
- `/out` - 퇴근 체크
- `/log [업무 내용]` - 업무 기록 작성
- 웹 대시보드에서 최근 출퇴근 기록 확인
- 🔐 **관리자 페이지** - 주 단위 근태 관리
  - 로그인 보호
  - 일~토 주간 근태 현황 테이블
  - 사용자별 출근/퇴근 시간 및 근무시간 표시
  - 📝 업무 로그 통합 표시 (각 날짜별 업무 내용)
  - 8명 이상 팀원도 한눈에 볼 수 있는 컴팩트한 뷰
  - 이전/다음 주 탐색 기능
- 📊 **주간 요약 자동 발송** - Slack 채널에 주간 근무 시간 요약 자동 전송
  - 매주 토요일 아침 9시(한국 시간) 자동 실행
  - 팀원별 누적 근무 시간 요약
  - 설정 방법은 [WEEKLY_SUMMARY_SETUP.md](./WEEKLY_SUMMARY_SETUP.md) 참고

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
     - Request URL: `https://slack-attendance.lemonaatree.workers.dev/slack/command`
   - `/out` 커맨드 생성
     - Request URL: `https://slack-attendance.lemonaatree.workers.dev/slack/command`
   - `/log` 커맨드 생성
     - Request URL: `https://slack-attendance.lemonaatree.workers.dev/slack/command`
3. **Basic Information**에서 `Signing Secret` 복사
4. **OAuth & Permissions**에서 다음 스코프 추가:
   - `commands` - Slash Commands 사용
   - `chat:write` - 메시지 전송

### 4. 환경 변수 설정

`wrangler.json`에서 다음 환경 변수를 설정:

```json
{
  "vars": {
    "SLACK_SIGNING_SECRET": "your_signing_secret_here",
    "ADMIN_PASSWORD": "your_admin_password_here"
  }
}
```

- `SLACK_SIGNING_SECRET`: Slack 앱의 Signing Secret
- `ADMIN_PASSWORD`: 관리자 페이지 접근 비밀번호 (기본값: `admin123`)

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

### Slack 채널에서:
- `/in` - 출근 체크
- `/out` - 퇴근 체크
- `/log [업무 내용]` - 업무 기록 작성
  - 예: `/log 회원가입 API 개발 완료`
  - 예: `/log 디자인 시안 검토 및 피드백 전달`

### 웹 브라우저에서:
- `/` - 최근 20개 출퇴근 기록 확인 (로그인 불필요)
- `/stats` - 주간 근태 관리 페이지 (로그인 필요)
  - 기본 비밀번호: `admin123` (환경 변수에서 변경 가능)
  - 주 단위 출퇴근 현황 테이블
  - 각 사용자의 일별 출근/퇴근 시간 및 근무시간 확인
  - 각 날짜별 업무 로그 통합 표시

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

### Attendance (출퇴근 기록)
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

### Work Logs (업무 기록)
```sql
CREATE TABLE work_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    log_content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
