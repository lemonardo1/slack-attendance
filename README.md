# Slack 출퇴근 & 업무 관리 봇

Cloudflare Workers + D1 Database를 사용한 Slack 출퇴근 및 업무 티켓 관리 시스템입니다.

## ✨ 주요 기능

### 📥 출퇴근 관리
- `/in` - 출근 체크
- `/out` - 퇴근 체크
- 주간 근태 현황 대시보드
- 자동 주간 요약 리포트

### 📋 업무 티켓 관리
- `/log [티켓제목] [@담당자]` - 업무 티켓 생성
- `/start [티켓-이름]` - 업무 시작
- `/end [티켓-이름]` - 업무 완료
- `/assign [티켓-이름] @담당자` - 담당자 할당

### 🎨 Notion 스타일 웹 대시보드
- **인터랙티브 티켓 보드**: https://slack-attendance.lemonaatree.workers.dev/
  - 업무명 클릭하여 수정
  - 상태 드롭다운 (대기/진행/완료)
  - 담당자/작성자 검색 및 선택
  - 캘린더로 시작일/마감일 설정
  - 상태 변경 시 자동 날짜 설정
  - 실시간 업데이트

- **주간 통계**: https://slack-attendance.lemonaatree.workers.dev/stats
  - 로그인 보호
  - 팀원별 출근/퇴근 시간
  - 근무시간 자동 계산
  - 이전/다음 주 탐색

- **회의 시간 조율(When2Meet 스타일)**: https://slack-attendance.lemonaatree.workers.dev/meetings
  - + 버튼으로 회의 생성
  - 요일별 시간 범위 설정 (예: 월 9~22, 화 10~15)
  - 구성원별 가능 시간 선택
  - 겹치는 가능한 시간 히트맵 시각화

### 🔔 자동 알림
- 매주 토요일 00:00 - 주간 요약
- 매일 19:00 - 일일 리마인더

## 🚀 빠른 시작

### 1. 프로젝트 클론 및 설치

```bash
git clone <repository-url>
cd slack-attendance
npm install
```

### 2. Slack 앱 설정

**📖 자세한 설정 가이드**: [SLACK_SETUP_GUIDE.md](./SLACK_SETUP_GUIDE.md)

간단 요약:
1. [Slack API](https://api.slack.com/apps)에서 앱 생성
2. Signing Secret, Bot Token, Webhook URL 복사
3. `wrangler.json`에 환경 변수 설정
4. Slash Commands 등록

### 3. 배포

```bash
npm run deploy
```

배포 완료 후 출력되는 URL을 확인하세요.

## 📖 사용 방법

### Slack 명령어

#### 출퇴근 관리
```
/in          # 출근 체크
/out         # 퇴근 체크
```

#### 업무 티켓 관리
```
/log 회원가입 API 개발 @홍길동          # 티켓 생성 및 담당자 지정
/log 디자인 시안 검토                   # 티켓 생성 (담당자 미지정)
/start 회원가입-API-개발                # 티켓 시작
/end 회원가입-API-개발                  # 티켓 완료
/assign 회원가입-API-개발 @김철수       # 담당자 변경
```

### 웹 대시보드

#### 티켓 보드
**URL**: https://slack-attendance.lemonaatree.workers.dev/

기능:
- ✅ 새 티켓 생성
- ✏️ 업무명 클릭하여 수정
- 🔄 상태 드롭다운 (대기/진행/완료)
- 👤 담당자/작성자 검색 및 선택
- 📅 시작일/마감일 캘린더 선택
- ⚡ 상태 변경 시 자동 날짜 설정

#### 주간 통계
**URL**: https://slack-attendance.lemonaatree.workers.dev/stats

기능:
- 🔐 로그인 보호 (비밀번호 로그인 + Google 로그인 선택 가능)
- 📊 주 단위 출퇴근 현황
- ⏱️ 근무시간 자동 계산
- 📝 일별 업무 로그 표시
- ◀️▶️ 이전/다음 주 탐색

#### 회의 시간 조율
**URL**: https://slack-attendance.lemonaatree.workers.dev/meetings

빠른 사용 순서:
- 1) 회의 제목/시간/가능 요일-시간 범위를 입력해 회의 생성
- 2) 생성된 링크를 팀에 공유
- 3) 각 팀원이 이름 입력 후 가능 시간을 클릭해 저장
- 4) 하단 추천 시간대(겹치는 인원 순)로 최종 시간 결정

Google 로그인을 활성화하려면 환경 변수에 아래 값을 추가하세요:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (선택, 미설정 시 `/stats/auth/google/callback` 자동 사용)
- `GOOGLE_ALLOWED_DOMAIN` (선택, 예: `example.com` 또는 `example.com,example.org`)

## 개발

로컬 개발 서버 실행:
```bash
npm run dev
```

타입 체크:
```bash
npm run check
```

## 라이센스

MIT License - 자세한 내용은 [LICENSE](./LICENSE) 파일을 참고하세요.

## 🗄️ 데이터베이스 스키마

### Attendance (출퇴근 기록)
```sql
CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('in', 'out')),
    is_auto INTEGER NOT NULL DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Work Tickets (업무 티켓)
```sql
CREATE TABLE work_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    ticket_title TEXT NOT NULL,
    ticket_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    assignee_id TEXT,
    assignee_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);
```

### Users (사용자)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    user_name TEXT NOT NULL,
    display_name TEXT,
    email TEXT,
    team_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🛠️ 기술 스택

- **Backend**: Cloudflare Workers (서버리스)
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JavaScript + HTML/CSS
- **Language**: TypeScript
- **Integration**: Slack API

## 📝 라이센스

MIT License - 자세한 내용은 [LICENSE](./LICENSE) 파일을 참고하세요.
