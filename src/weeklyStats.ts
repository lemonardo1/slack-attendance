/**
 * Weekly attendance statistics
 */

export interface AttendanceRecord {
  user_id: string;
  user_name: string;
  type: 'in' | 'out';
  timestamp: string;
}

export interface WorkLog {
  log_content: string;
  timestamp: string;
}

export interface DayStats {
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
  workLogs: WorkLog[];
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
 * in 기점으로 다음 out을 매칭 (야근 처리 포함)
 */
export function processWeeklyStats(records: AttendanceRecord[], weekDates: string[]): Map<string, UserWeekStats> {
  const userStatsMap = new Map<string, UserWeekStats>();

  console.log('processWeeklyStats - Input records:', records.length);
  console.log('processWeeklyStats - Week dates:', weekDates);

  // Group records by user
  const userRecordsMap = new Map<string, AttendanceRecord[]>();
  records.forEach(record => {
    if (!userRecordsMap.has(record.user_id)) {
      userRecordsMap.set(record.user_id, []);
    }
    userRecordsMap.get(record.user_id)!.push(record);
  });

  console.log('processWeeklyStats - Users found:', userRecordsMap.size);

  // Process each user's records
  userRecordsMap.forEach((userRecords, userId) => {
    // Sort records by timestamp
    const sortedRecords = [...userRecords].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Initialize user stats
    const days: { [key: string]: DayStats } = {};
    weekDates.forEach(date => {
      days[date] = { checkIn: null, checkOut: null, workHours: null, workLogs: [] };
    });

    // Match in with next out (야근 처리)
    for (let i = 0; i < sortedRecords.length; i++) {
      const record = sortedRecords[i];
      
      if (record.type === 'in') {
        // Extract date from timestamp (handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:MM:SS' formats)
        const inDate = record.timestamp.includes('T') 
          ? record.timestamp.split('T')[0] 
          : record.timestamp.split(' ')[0];
        
        console.log(`Processing in record for ${userId} on ${inDate}, weekDates includes: ${weekDates.includes(inDate)}`);
        
        // Only process if this date is in our week range
        if (days[inDate]) {
          days[inDate].checkIn = record.timestamp;
          
          // Find next out record
          for (let j = i + 1; j < sortedRecords.length; j++) {
            if (sortedRecords[j].type === 'out') {
              days[inDate].checkOut = sortedRecords[j].timestamp;
              days[inDate].workHours = calculateWorkHours(record.timestamp, sortedRecords[j].timestamp);
              console.log(`Matched out for ${userId} on ${inDate}, work hours: ${days[inDate].workHours}`);
              break;
            }
          }
        } else {
          console.log(`Date ${inDate} not in week range for ${userId}`);
        }
      }
    }

    userStatsMap.set(userId, {
      userId,
      userName: sortedRecords[0].user_name,
      days
    });
  });

  console.log('processWeeklyStats - Final userStatsMap size:', userStatsMap.size);

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

