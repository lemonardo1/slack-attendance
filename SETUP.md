# Slack 앱 빠른 설정 가이드

## 1. Slack 앱 생성

1. https://api.slack.com/apps 접속
2. "Create New App" 클릭
3. "From scratch" 선택
4. App Name: "출퇴근 봇" (원하는 이름)
5. Workspace 선택 후 "Create App" 클릭

## 2. Slash Commands 설정

### /in 커맨드
1. 왼쪽 메뉴에서 "Slash Commands" 클릭
2. "Create New Command" 클릭
3. 다음 정보 입력:
   - Command: `/in`
   - Request URL: `https://slack-attendance.lemonaatree.workers.dev/slack/command`
   - Short Description: `출근 체크`
   - Usage Hint: (비워둬도 됨)
4. "Save" 클릭

### /out 커맨드
1. "Create New Command" 다시 클릭
2. 다음 정보 입력:
   - Command: `/out`
   - Request URL: `https://slack-attendance.lemonaatree.workers.dev/slack/command`
   - Short Description: `퇴근 체크`
   - Usage Hint: (비워둬도 됨)
3. "Save" 클릭

## 3. Signing Secret 복사

1. 왼쪽 메뉴에서 "Basic Information" 클릭
2. "App Credentials" 섹션 찾기
3. "Signing Secret" 값 복사 (Show 버튼 클릭)

## 4. OAuth & Permissions 설정

1. 왼쪽 메뉴에서 "OAuth & Permissions" 클릭
2. "Scopes" > "Bot Token Scopes" 섹션에서 다음 스코프 추가:
   - `commands` - Add shortcuts and/or slash commands
   - `chat:write` - Send messages as @출퇴근 봇

## 5. 워크스페이스에 앱 설치

1. 왼쪽 메뉴에서 "Install App" 클릭
2. "Install to Workspace" 버튼 클릭
3. 권한 요청 확인 후 "Allow" 클릭

## 6. Cloudflare Worker 배포

### 환경 변수 설정

`wrangler.json` 파일에서 환경 변수 업데이트:

```json
{
  "vars": {
    "SLACK_SIGNING_SECRET": "복사한_signing_secret_여기에_붙여넣기",
    "ADMIN_PASSWORD": "원하는_관리자_비밀번호"
  }
}
```

- **SLACK_SIGNING_SECRET**: 3단계에서 복사한 Signing Secret
- **ADMIN_PASSWORD**: `/stats` 관리자 페이지 접근용 비밀번호 (원하는 값으로 설정)

### 데이터베이스 마이그레이션

```bash
npm run predeploy
```

### 배포

```bash
npm run deploy
```

배포가 완료되면 Worker URL이 출력됩니다. (예: `https://slack-attendance.your-subdomain.workers.dev`)

## 7. Slack 앱의 Request URL 업데이트

배포 후:
1. Slack 앱 설정 페이지로 돌아가기
2. "Slash Commands" 메뉴 클릭
3. `/in` 커맨드의 "Edit" 클릭
4. Request URL을 실제 Worker URL로 업데이트: `https://slack-attendance.your-subdomain.workers.dev/slack/command`
5. "Save" 클릭
6. `/out` 커맨드도 동일하게 업데이트

## 8. 테스트

### Slack 워크스페이스에서:
- `/in` 입력 → 출근 체크 확인
- `/out` 입력 → 퇴근 체크 확인

### 웹 브라우저에서:
- `https://slack-attendance.your-subdomain.workers.dev/` - 최근 출퇴근 기록 확인
- `https://slack-attendance.your-subdomain.workers.dev/stats` - 주간 근태 관리 (로그인 필요)

### 관리자 페이지 사용법:
1. `/stats` 접속
2. 설정한 비밀번호로 로그인
3. 주간 근태 현황 테이블 확인
   - 일~토 요일별 출근/퇴근 시간 표시
   - 근무시간 자동 계산
   - 이전/다음 주 탐색 가능

## 문제 해결

### "dispatch_failed" 오류
- Request URL이 올바른지 확인
- Worker가 정상적으로 배포되었는지 확인 (`/health` 엔드포인트 접속해보기)

### "invalid_request" 오류
- Signing Secret이 올바르게 설정되었는지 확인
- `wrangler.json`의 환경 변수 확인

### 데이터베이스 오류
- 마이그레이션이 실행되었는지 확인: `npm run predeploy`
- Wrangler D1 대시보드에서 데이터베이스 상태 확인

