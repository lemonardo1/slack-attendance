# Slack 앱 설정 가이드

이 가이드는 Slack 앱 생성부터 배포까지 전체 과정을 안내합니다.

## 📋 목차
1. [✅ Slack 앱 생성 (완료)](#1-slack-앱-생성-완료)
2. [🔑 토큰 및 Signing Secret 복사](#2-토큰-및-signing-secret-복사)
3. [⚙️ Bot 권한 설정](#3-bot-권한-설정)
4. [📱 워크스페이스에 앱 설치](#4-워크스페이스에-앱-설치)
5. [🔧 환경 변수 설정](#5-환경-변수-설정)
6. [🗄️ 데이터베이스 마이그레이션](#6-데이터베이스-마이그레이션)
7. [🚀 Cloudflare Workers 배포](#7-cloudflare-workers-배포)
8. [💬 Slash Commands 설정](#8-slash-commands-설정)
9. [🧪 테스트](#9-테스트)
10. [❓ 문제 해결](#10-문제-해결)

---

## 1. Slack 앱 생성 (완료)

✅ **현재 상태**: 앱 생성 완료
- **App ID**: `A0AEAC8FYBG`
- **Client ID**: `10389600743842.10486416542390`
- **생성일**: 2026년 2월 11일

다음 단계로 진행하세요.

---

## 2. 토큰 및 Signing Secret 복사

현재 화면에서 필요한 정보를 복사합니다.

### 2-1. Signing Secret 복사 (필수)
1. 현재 **"Basic Information"** 페이지에 있습니다
2. **"App Credentials"** 섹션에서 **"Signing Secret"** 찾기
3. **"Show"** 버튼 클릭
4. 값을 복사하여 메모장에 임시 저장

```
예시: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 2-2. Client Secret 복사 (OAuth용, 선택)
1. 같은 페이지의 **"Client Secret"** 찾기
2. **"Show"** 버튼 클릭
3. 값을 복사하여 메모장에 임시 저장

> 💡 **참고**: 지금은 복사만 해두고, 나중에 환경 변수 설정 시 사용합니다.

---

## 3. Bot 권한 설정

Slack 앱이 필요한 작업을 수행할 수 있도록 권한을 설정합니다.

### 3-1. OAuth & Permissions 페이지로 이동
1. 좌측 메뉴에서 **"OAuth & Permissions"** 클릭

### 3-2. Bot Token Scopes 추가
**"Scopes"** 섹션 → **"Bot Token Scopes"**에서 다음 권한 추가:

**필수 권한:**
- `commands` - Slash Commands 사용
- `chat:write` - 메시지 전송

**추천 권한 (사용자 정보 조회용):**
- `users:read` - 사용자 기본 정보 조회
- `users:read.email` - 사용자 이메일 조회

각 권한을 추가하려면:
1. **"Add an OAuth Scope"** 버튼 클릭
2. 권한 이름 입력 (예: `commands`)
3. 선택하여 추가
4. 위 4개 권한 모두 추가

---

## 4. 워크스페이스에 앱 설치

권한 설정 후 워크스페이스에 앱을 설치합니다.

### 4-1. 앱 설치
1. **"OAuth & Permissions"** 페이지 상단에 **"Install to Workspace"** 버튼이 나타남
2. **"Install to Workspace"** 클릭
3. 권한 요청 화면에서 **"Allow"** 클릭

### 4-2. Bot Token 복사
설치 완료 후:
1. **"Bot User OAuth Token"** 이 표시됨 (형식: `xoxb-...`)
2. 토큰을 복사하여 메모장에 임시 저장

```
예시: xoxb-[YOUR_BOT_TOKEN_HERE]
```

### 4-3. Incoming Webhook 설정 (주간 요약 알림용)
1. 좌측 메뉴에서 **"Incoming Webhooks"** 클릭
2. **"Activate Incoming Webhooks"** 토글을 **ON**으로 변경
3. 페이지 하단 **"Add New Webhook to Workspace"** 클릭
4. 알림을 받을 채널 선택 (예: `#general`, `#attendance`)
5. **"Allow"** 클릭
6. 생성된 **"Webhook URL"** 복사하여 메모장에 임시 저장

```
예시: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX
```

---

## 5. 환경 변수 설정

이제 복사한 토큰들을 프로젝트에 설정합니다.

### 5-1. wrangler.json 파일 수정

프로젝트 루트의 `wrangler.json` 파일을 열고 다음 값들을 업데이트:

```json
{
  "compatibility_date": "2025-04-01",
  "main": "src/index.ts",
  "name": "slack-attendance",
  "d1_databases": [
    {
      "binding": "DB",
      "database_id": "48c1b95d-b76e-41b7-94d9-4a259235ba4e",
      "database_name": "essentialcitronnier-attendance-slack"
    }
  ],
  "vars": {
    "SLACK_SIGNING_SECRET": "여기에_복사한_Signing_Secret_붙여넣기",
    "ADMIN_PASSWORD": "원하는_관리자_비밀번호_설정",
    "SLACK_WEBHOOK_URL": "여기에_복사한_Webhook_URL_붙여넣기",
    "WORKER_URL": "https://slack-attendance.lemonaatree.workers.dev"
  }
}
```

**설정할 값:**
- `SLACK_SIGNING_SECRET`: 2-1단계에서 복사한 Signing Secret
- `ADMIN_PASSWORD`: 대시보드 접근용 비밀번호 (원하는 값으로 설정)
- `SLACK_WEBHOOK_URL`: 4-3단계에서 복사한 Webhook URL
- `WORKER_URL`: 이미 배포된 Worker URL (변경 불필요)

> ⚠️ **보안 주의**: `wrangler.json` 파일은 Git에 커밋하지 마세요!

### 5-2. 환경 변수 타입 재생성

```bash
npx wrangler types
```

---

## 6. 데이터베이스 마이그레이션

데이터베이스는 이미 설정되어 있으므로 이 단계는 건너뛰어도 됩니다.

기존 마이그레이션 확인:
```bash
npx wrangler d1 execute essentialcitronnier-attendance-slack --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```

---

## 7. Cloudflare Workers 배포

환경 변수 설정 후 Worker를 재배포합니다.

### 7-1. 로컬 테스트 (선택)
```bash
npm run dev
```

브라우저에서 `http://localhost:8787/` 접속하여 티켓 보드 확인

### 7-2. 프로덕션 배포
```bash
npm run deploy
```

배포 완료 후 출력되는 URL 확인:
```
Deployed slack-attendance triggers (1.57 sec)
  https://slack-attendance.lemonaatree.workers.dev
```

---

## 8. Slash Commands 설정

이제 Slack 명령어들을 설정합니다.

### 8-1. Request URL
모든 명령어의 Request URL은 동일합니다:
```
https://slack-attendance.lemonaatree.workers.dev/slack/command
```

### 8-2. Commands 생성

1. Slack 앱 설정 페이지로 돌아가기
2. 좌측 메뉴에서 **"Slash Commands"** 클릭
3. **"Create New Command"** 클릭
4. 다음 명령어들을 **하나씩** 생성:

#### 📥 `/in` - 출근 체크
- **Command**: `/in`
- **Request URL**: `https://slack-attendance.lemonaatree.workers.dev/slack/command`
- **Short Description**: `출근 체크`
- **Usage Hint**: (비워둠)

#### 📤 `/out` - 퇴근 체크
- **Command**: `/out`
- **Request URL**: `https://slack-attendance.lemonaatree.workers.dev/slack/command`
- **Short Description**: `퇴근 체크`
- **Usage Hint**: (비워둠)

#### 📝 `/create` - 업무 티켓 생성
- **Command**: `/create`
- **Request URL**: `https://slack-attendance.lemonaatree.workers.dev/slack/command`
- **Short Description**: `업무 티켓 생성`
- **Usage Hint**: `업무 내용`

#### 🎯 `/assign` - 담당자 할당
- **Command**: `/assign`
- **Request URL**: `https://slack-attendance.lemonaatree.workers.dev/slack/command`
- **Short Description**: `티켓 담당자 변경`
- **Usage Hint**: `티켓-이름 @담당자`

#### ▶️ `/start` - 업무 시작
- **Command**: `/start`
- **Request URL**: `https://slack-attendance.lemonaatree.workers.dev/slack/command`
- **Short Description**: `업무 티켓 시작`
- **Usage Hint**: `티켓-이름`

#### ✅ `/end` - 업무 완료
- **Command**: `/end`
- **Request URL**: `https://slack-attendance.lemonaatree.workers.dev/slack/command`
- **Short Description**: `업무 티켓 완료`
- **Usage Hint**: `티켓-이름`

각 명령어 생성 후 **"Save"** 버튼을 클릭하세요.

---

## 9. 테스트

### 9-1. Slack 워크스페이스에서 테스트

Slack 채널에서 다음 명령어들을 시도해보세요:

```
/in
```
→ 출근 체크 완료 메시지 확인

```
/create 회원가입 API 개발
```
→ 티켓 생성 완료 메시지 확인

```
/start 회원가입-API-개발
```
→ 티켓 시작 메시지 확인

```
/end 회원가입-API-개발
```
→ 티켓 완료 메시지 확인

```
/out
```
→ 퇴근 체크 완료 메시지 확인

### 9-2. 웹 대시보드 확인

브라우저에서 접속:
- **티켓 보드**: https://slack-attendance.lemonaatree.workers.dev/
- **주간 통계**: https://slack-attendance.lemonaatree.workers.dev/stats
- **회의 시간 조율**: https://slack-attendance.lemonaatree.workers.dev/meetings

대시보드에서 다음 기능 테스트:
- ✅ 새 티켓 생성
- ✅ 업무명 클릭하여 수정
- ✅ 상태 변경 (대기 → 진행 → 완료)
- ✅ 담당자 선택
- ✅ 시작일/마감일 설정
- ✅ 회의 생성 후 가능 시간 선택/저장

---

## 10. 문제 해결

### 10-1. "dispatch_failed" 오류
**원인**: Slack이 Request URL에 접속할 수 없음

**해결 방법**:
1. Request URL이 올바른지 확인
2. Worker가 정상 배포되었는지 확인
3. 브라우저에서 `https://slack-attendance.lemonaatree.workers.dev/` 접속 시도
4. 페이지가 로드되지 않으면 Worker 재배포: `npm run deploy`

### 10-2. "invalid_signature" 오류
**원인**: Signing Secret이 올바르지 않음

**해결 방법**:
1. Slack 앱 설정 → Basic Information → Signing Secret 다시 확인
2. `wrangler.json`의 `SLACK_SIGNING_SECRET` 값 확인
3. 값이 정확한지 확인 (공백 없이)
4. Worker 재배포: `npm run deploy`

### 10-3. 명령어가 응답하지 않음
**원인**: Worker 내부 오류

**해결 방법**:
1. 실시간 로그 확인:
   ```bash
   npx wrangler tail
   ```
2. Slack에서 명령어 실행
3. 로그에서 오류 메시지 확인
4. 오류 내용에 따라 수정

### 10-4. 티켓이 생성되지 않음
**원인**: 데이터베이스 테이블 누락

**해결 방법**:
```bash
# 마이그레이션 재실행
npx wrangler d1 execute essentialcitronnier-attendance-slack --remote --file=migrations/0005_create_work_tickets_table.sql
npx wrangler d1 execute essentialcitronnier-attendance-slack --remote --file=migrations/0006_create_users_table.sql
npx wrangler d1 execute essentialcitronnier-attendance-slack --remote --file=migrations/0007_add_assignee_to_tickets.sql
```

### 10-5. Webhook 알림이 오지 않음
**원인**: Webhook URL이 올바르지 않음

**해결 방법**:
1. Slack 앱 설정 → Incoming Webhooks 확인
2. Webhook URL 다시 복사
3. `wrangler.json`의 `SLACK_WEBHOOK_URL` 업데이트
4. Worker 재배포

---

## 🎉 완료!

모든 설정이 완료되었습니다. 이제 다음을 사용할 수 있습니다:

### Slack 명령어
- `/in`: 출근 기록
- `/out`: 퇴근 기록
- `/create`: 업무 기록 및 티켓 생성 (예: `/create 회원가입 API 개발`)
- `/assign`: 티켓 담당자 지정 (예: `/assign FE-001 @담당자`)
- `/start`: 업무 시작 (예: `/start FE-001`)
- `/end`: 업무 완료 (예: `/end FE-001`)

### 웹 대시보드
- **티켓 보드**: https://slack-attendance.lemonaatree.workers.dev/
- **주간 통계**: https://slack-attendance.lemonaatree.workers.dev/stats
- **회의 시간 조율**: https://slack-attendance.lemonaatree.workers.dev/meetings

### 자동 알림
- 매주 토요일 00:00 - 주간 요약
- 매일 19:00 - 일일 리마인더

---

## 📚 추가 자료

- [Slack API 문서](https://api.slack.com/docs)
- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [D1 데이터베이스 문서](https://developers.cloudflare.com/d1/)

문제가 계속되면 `npx wrangler tail` 명령어로 실시간 로그를 확인하세요.
