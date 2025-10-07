/**
 * Weekly attendance statistics
 */

export interface AttendanceRecord {
  user_id: string;
  user_name: string;
  type: 'in' | 'out';
  timestamp: string;
}

export interface DayStats {
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
}

export interface UserWeekStats {
  userId: string;
  userName: string;
  days: {
    [key: string]: DayStats; // 'YYYY-MM-DD' -> DayStats
  };
}

/**
 * Get the start of the week (Sunday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Go back to Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get array of dates for the week starting from given date
 */
export function getWeekDates(weekStart: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Calculate work hours between check-in and check-out
 */
export function calculateWorkHours(checkIn: string, checkOut: string): number {
  const inTime = new Date(checkIn).getTime();
  const outTime = new Date(checkOut).getTime();
  const diffMs = outTime - inTime;
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal
}

/**
 * Process attendance records into weekly statistics
 */
export function processWeeklyStats(records: AttendanceRecord[], weekDates: string[]): Map<string, UserWeekStats> {
  const userStatsMap = new Map<string, UserWeekStats>();

  // Initialize user stats
  records.forEach(record => {
    if (!userStatsMap.has(record.user_id)) {
      const days: { [key: string]: DayStats } = {};
      weekDates.forEach(date => {
        days[date] = { checkIn: null, checkOut: null, workHours: null };
      });
      userStatsMap.set(record.user_id, {
        userId: record.user_id,
        userName: record.user_name,
        days
      });
    }
  });

  // Process records
  records.forEach(record => {
    const userStats = userStatsMap.get(record.user_id);
    if (!userStats) return;

    const recordDate = record.timestamp.split('T')[0];
    if (!userStats.days[recordDate]) return;

    if (record.type === 'in') {
      userStats.days[recordDate].checkIn = record.timestamp;
    } else if (record.type === 'out') {
      userStats.days[recordDate].checkOut = record.timestamp;
    }
  });

  // Calculate work hours
  userStatsMap.forEach(userStats => {
    Object.keys(userStats.days).forEach(date => {
      const day = userStats.days[date];
      if (day.checkIn && day.checkOut) {
        day.workHours = calculateWorkHours(day.checkIn, day.checkOut);
      }
    });
  });

  return userStatsMap;
}

/**
 * Get day name in Korean
 */
export function getDayName(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[date.getDay()];
}

/**
 * Format time for display (HH:MM)
 */
export function formatTime(timestamp: string | null): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

