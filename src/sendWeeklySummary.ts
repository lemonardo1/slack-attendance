/**
 * Send weekly summary to Slack channel
 */

import { 
  getWeekStart, 
  getWeekDates, 
  processWeeklyStats, 
  AttendanceRecord,
  UserWeekStats
} from "./weeklyStats";

/**
 * Calculate total work hours for a user in a week
 */
function calculateTotalHours(userStats: UserWeekStats): number {
  let total = 0;
  Object.values(userStats.days).forEach(day => {
    if (day.workHours) {
      total += day.workHours;
    }
  });
  return Math.round(total * 10) / 10; // Round to 1 decimal
}

/**
 * Format hours to HH:MM format
 */
function formatHoursToTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Send weekly summary to Slack
 */
export async function sendWeeklySummary(env: Env): Promise<void> {
  try {
    // Get the previous week (since we run on Saturday morning)
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    const weekStart = getWeekStart(lastWeek);
    const weekDates = getWeekDates(weekStart);

    // Fetch attendance records for the week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const stmt = env.DB.prepare(`
      SELECT user_id, user_name, type, timestamp
      FROM attendance 
      WHERE date(timestamp) >= ? AND date(timestamp) < ?
      ORDER BY timestamp ASC
    `);
    
    const { results } = await stmt
      .bind(weekStartStr, weekEndStr)
      .all();

    if (!results || results.length === 0) {
      console.log('No attendance records found for the week');
      return;
    }

    // Process weekly stats
    const userStatsMap = processWeeklyStats(results as unknown as AttendanceRecord[], weekDates);

    // Build Slack message
    const weekEndDate = new Date(weekEnd);
    weekEndDate.setDate(weekEndDate.getDate() - 1);
    const weekLabel = `${weekStart.toLocaleDateString('ko-KR')} ~ ${weekEndDate.toLocaleDateString('ko-KR')}`;

    let message = `📊 *주간 근무 시간 요약*\n`;
    message += `기간: ${weekLabel}\n\n`;

    // Sort users by total hours (descending)
    const userStatsArray = Array.from(userStatsMap.values());
    userStatsArray.sort((a, b) => calculateTotalHours(b) - calculateTotalHours(a));

    // Add each user's stats
    userStatsArray.forEach(userStats => {
      const totalHours = calculateTotalHours(userStats);
      const formattedTime = formatHoursToTime(totalHours);
      message += `• *${userStats.userName}*: ${formattedTime} (${totalHours}시간)\n`;
    });

    message += `\n🔗 자세한 내용: ${env.WORKER_URL || 'https://your-worker.workers.dev'}/stats`;

    // Send to Slack
    if (!env.SLACK_WEBHOOK_URL || env.SLACK_WEBHOOK_URL === 'YOUR_WEBHOOK_URL_HERE') {
      console.warn('SLACK_WEBHOOK_URL not configured, skipping Slack notification');
      console.log('Would have sent message:', message);
      return;
    }

    const response = await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send Slack message: ${response.status} ${errorText}`);
    }

    console.log('Weekly summary sent successfully to Slack');
  } catch (error) {
    console.error('Error sending weekly summary:', error);
    throw error;
  }
}


