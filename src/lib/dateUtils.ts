export const TODAY_ISO = '2026-09-22'; // Current system date

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface CalendarDayCell {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
}

/**
 * Builds standard 35 or 42 day calendar matrix for a given year & month (1-indexed month)
 */
export function buildMonthGrid(year: number, month: number): CalendarDayCell[] {
  // month is 1-12
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const cells: CalendarDayCell[] = [];

  // Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const mStr = prevMonth < 10 ? `0${prevMonth}` : `${prevMonth}`;
    const dStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    const iso = `${prevYear}-${mStr}-${dStr}`;

    cells.push({
      date: iso,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: iso === TODAY_ISO,
      dayOfWeek: (startingDayOfWeek - 1 - i) % 7
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const mStr = month < 10 ? `0${month}` : `${month}`;
    const dStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    const iso = `${year}-${mStr}-${dStr}`;
    const dayOfWeek = new Date(year, month - 1, dayNum).getDay();

    cells.push({
      date: iso,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: iso === TODAY_ISO,
      dayOfWeek
    });
  }

  // Next month leading days to complete full weeks (either 35 or 42 cells total)
  const remaining = (7 - (cells.length % 7)) % 7;
  // If 35 isn't enough or to keep 5/6 rows steady
  const totalNeeded = cells.length + remaining < 35 ? 35 : cells.length + remaining;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  let nextDayNum = 1;
  while (cells.length < totalNeeded) {
    const mStr = nextMonth < 10 ? `0${nextMonth}` : `${nextMonth}`;
    const dStr = nextDayNum < 10 ? `0${nextDayNum}` : `${nextDayNum}`;
    const iso = `${nextYear}-${mStr}-${dStr}`;
    const dayOfWeek = (cells[cells.length - 1].dayOfWeek + 1) % 7;

    cells.push({
      date: iso,
      dayNumber: nextDayNum,
      isCurrentMonth: false,
      isToday: iso === TODAY_ISO,
      dayOfWeek
    });
    nextDayNum++;
  }

  return cells;
}

export function formatHumanDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
