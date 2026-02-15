#!/bin/bash

# Configuration
URL="https://slack-attendance.lemonaatree.workers.dev/api/tickets"
TASKS=(
  "1.1 회원가입 및 로그인 플로우"
  "1.2 CKD 환자 프로필 설정"
  "1.3 개인정보 보호 및 동의"
  "2.1 앱 초기 실행 시 안내"
  "2.2 앱 내 지속적 표시"
  "2.3 앱 스토어 메타데이터"
  "3.1 식품 입력 UI"
  "3.2 AI 분석 결과 표시"
  "3.3 주의사항 표시"
  "4.1 일일 건강 로그 입력"
  "4.2 건강 기록 시각화"
  "4.3 데이터 관리"
  "5.1 채팅 UI"
  "5.2 건강 맥락 반영"
  "5.3 주의사항 표시"
  "6.1 레시피 목록 및 검색"
  "6.2 커뮤니티 게시글"
  "6.3 저인 식품 정보"
  "7. 오류 처리 및 사용자 안내"
  "8. 접근성 및 사용성"
  "9. 보안 및 개인정보 보호"
  "10. 버전 관리 및 업데이트"
  "11. 모니터링 및 분석"
  "12. 테스트 및 검증"
  "13. 배포 준비"
)

echo "Starting seeding of SaMD tasks to $URL..."

for task in "${TASKS[@]}"; do
  echo "Adding task: $task"
  curl -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d "{\"description\": \"$task\"}"
  echo ""
  sleep 0.2
done

echo "Seeding complete!"
