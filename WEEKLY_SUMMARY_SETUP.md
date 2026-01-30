# 주간 요약 자동 발송 설정 가이드

매주 토요일 아침 9시(한국 시간)에 Slack 채널로 주간 근무 시간 요약을 자동으로 보내는 기능입니다.

## 📋 기능

- **자동 발송**: 매주 토요일 00:00 UTC (한국 시간 09:00)에 자동 실행
- **주간 요약**: 지난 주(일~토) 팀원별 누적 근무 시간
- **Slack 채널 전송**: 설정된 채널에 자동으로 메시지 발송

## 🔧 설정 방법

### 1. Slack Incoming Webhook 생성

1. [Slack API 웹사이트](https://api.slack.com/apps)에 접속
2. "Create New App" → "From scratch" 선택
3. App 이름과 워크스페이스 선택
4. 좌측 메뉴에서 "Incoming Webhooks" 선택
5. "Activate Incoming Webhooks" 토글을 ON으로 변경
6. "Add New Webhook to Workspace" 클릭
7. 메시지를 보낼 채널 선택
8. 생성된 Webhook URL 복사 (예: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### 2. wrangler.json 설정 업데이트

`wrangler.json` 파일에서 다음 값을 업데이트하세요:

```json
{
  "vars": {
    "SLACK_WEBHOOK_URL": "여기에_복사한_Webhook_URL_붙여넣기",
    "WORKER_URL": "https://your-worker-name.workers.dev" // 선택사항: 통계 페이지 링크용
  }
}
```

### 3. Cron 스케줄 조정 (선택사항)

기본 설정은 **매주 토요일 00:00 UTC** (한국 시간 09:00)입니다.

다른 시간으로 변경하고 싶다면 `wrangler.json`의 cron 표현식을 수정하세요:

```json
{
  "triggers": {
    "crons": ["0 0 * * 6"]  // 분 시 일 월 요일 (0=일요일, 6=토요일)
  }
}
```

**예시:**
- `0 0 * * 1`: 매주 월요일 00:00 UTC (한국 시간 09:00)
- `0 1 * * 6`: 매주 토요일 01:00 UTC (한국 시간 10:00)
- `0 23 * * 5`: 매주 금요일 23:00 UTC (한국 시간 토요일 08:00)

### 4. 배포

```bash
npm run deploy
```

또는

```bash
wrangler deploy
```

## 📊 메시지 형식 예시

```
📊 주간 근무 시간 요약
기간: 2025/12/09 ~ 2025/12/15

• 김철수: 40:15 (40.3시간)
• 이영희: 38:30 (38.5시간)
• 박민수: 35:45 (35.8시간)

🔗 자세한 내용: https://your-worker.workers.dev/stats
```

## 🧪 수동 테스트 방법

Cron이 실행되기 전에 테스트하고 싶다면, Wrangler CLI를 사용하여 수동으로 트리거할 수 있습니다:

```bash
wrangler deploy
wrangler tail  # 로그 확인용 (선택사항)

# 다른 터미널에서:
curl -X POST "https://your-worker-name.workers.dev/__scheduled?cron=0+0+*+*+6" \
  -H "Authorization: Bearer $(wrangler whoami | grep 'Account ID' | awk '{print $3}')"
```

또는 Cloudflare Dashboard에서:
1. Workers & Pages → 해당 Worker 선택
2. "Settings" → "Triggers" → "Cron Triggers"
3. 등록된 cron 옆의 "Run now" 버튼 클릭

## 🔍 로그 확인

배포 후 로그를 실시간으로 확인하려면:

```bash
wrangler tail
```

## ⚠️ 주의사항

1. **Webhook URL 보안**: `wrangler.json`에 Webhook URL을 직접 넣으면 Git에 노출될 수 있습니다.
   - 프로덕션에서는 Cloudflare Dashboard의 환경 변수로 설정하는 것을 권장합니다.
   - 또는 `.gitignore`에 `wrangler.json`을 추가하세요.

2. **시간대**: Cron은 UTC 기준으로 동작하므로 한국 시간(UTC+9)으로 변환하여 설정하세요.

3. **데이터 기간**: 토요일에 실행되면 지난 주(일요일~토요일) 데이터를 집계합니다.

## 🔒 환경 변수로 안전하게 설정하기 (권장)

`wrangler.json`에 직접 넣지 않고 Cloudflare Dashboard에서 설정:

1. Cloudflare Dashboard → Workers & Pages → 해당 Worker
2. Settings → Variables
3. "Add variable" 클릭
4. 변수 추가:
   - Name: `SLACK_WEBHOOK_URL`
   - Value: 복사한 Webhook URL
   - Type: Text (not secret) 또는 Encrypt 선택

그 후 `wrangler.json`에서 해당 줄 제거:

```json
{
  "vars": {
    "SLACK_SIGNING_SECRET": "your-slack-signing-secret",
    "ADMIN_PASSWORD": "your-admin-password"
    // SLACK_WEBHOOK_URL은 Dashboard에서 설정
  }
}
```

## 🎉 완료!

이제 매주 토요일 아침 9시마다 자동으로 주간 요약이 Slack 채널에 전송됩니다!

