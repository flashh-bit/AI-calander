import { db, DbEvent, DbHoliday } from './db';

export interface HolidayCountResult {
  queryType: 'holiday_count';
  count: number;
  periodDescription: string;
  holidays: Array<{ name: string; date: string; type: string }>;
}

export interface EventsResult {
  queryType: 'events_by_date' | 'events_by_range';
  count: number;
  periodDescription: string;
  events: Array<{
    id: string;
    title: string;
    date: string;
    time?: string;
    category: string;
    location?: string;
    description?: string;
  }>;
}

export interface DaySummaryResult {
  queryType: 'day_summary';
  date: string;
  formattedDate: string;
  holidays: Array<{ name: string; type: string }>;
  events: Array<{
    id: string;
    title: string;
    time?: string;
    category: string;
    location?: string;
  }>;
}

export interface MonthSummaryResult {
  queryType: 'month_summary';
  month: number;
  year: number;
  monthName: string;
  holidayCount: number;
  eventCount: number;
  holidays: Array<{ name: string; date: string; type: string }>;
  events: Array<{ id: string; title: string; date: string; category: string; time?: string }>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const queryLayer = {
  /**
   * Computes the exact number of holidays for a specific month, year, or date range
   */
  countHolidays(filter: { month?: number; year?: number; startDate?: string; endDate?: string }): HolidayCountResult {
    const holidays = db.getHolidays(filter);
    let periodDescription = '';

    if (filter.month && filter.year) {
      periodDescription = `${MONTH_NAMES[filter.month - 1]} ${filter.year}`;
    } else if (filter.month) {
      periodDescription = `${MONTH_NAMES[filter.month - 1]}`;
    } else if (filter.year) {
      periodDescription = `the year ${filter.year}`;
    } else if (filter.startDate && filter.endDate) {
      periodDescription = `${filter.startDate} to ${filter.endDate}`;
    } else {
      periodDescription = 'the requested period';
    }

    return {
      queryType: 'holiday_count',
      count: holidays.length,
      periodDescription,
      holidays: holidays.map(h => ({
        name: h.name,
        date: h.date,
        type: h.type
      }))
    };
  },

  /**
   * Retrieves holidays matching filter
   */
  getHolidays(filter: { month?: number; year?: number; startDate?: string; endDate?: string; limit?: number }) {
    const all = db.getHolidays(filter);
    const results = filter.limit ? all.slice(0, filter.limit) : all;
    return {
      total: all.length,
      holidays: results.map(h => ({
        id: h.id,
        name: h.name,
        date: h.date,
        type: h.type,
        description: h.description
      }))
    };
  },

  /**
   * Retrieves next upcoming holiday after reference date (defaults to 2026-09-22)
   */
  getNextHoliday(referenceDate = '2026-09-22') {
    const upcoming = db.getHolidays({ startDate: referenceDate });
    if (upcoming.length === 0) {
      return null;
    }
    const next = upcoming[0];
    return {
      id: next.id,
      name: next.name,
      date: next.date,
      type: next.type,
      description: next.description
    };
  },

  /**
   * Retrieves events for a specific user filtered by date or range
   */
  getUserEvents(userId: string, filter: { date?: string; startDate?: string; endDate?: string; category?: string }): EventsResult {
    const events = db.getEvents(userId, filter);
    let periodDesc = '';

    if (filter.date) {
      periodDesc = filter.date;
    } else if (filter.startDate && filter.endDate) {
      periodDesc = `${filter.startDate} to ${filter.endDate}`;
    } else if (filter.startDate) {
      periodDesc = `from ${filter.startDate} onwards`;
    } else {
      periodDesc = 'all time';
    }

    return {
      queryType: filter.date ? 'events_by_date' : 'events_by_range',
      count: events.length,
      periodDescription: periodDesc,
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.allDay ? 'All Day' : (e.startTime ? `${e.startTime}${e.endTime ? ' - ' + e.endTime : ''}` : undefined),
        category: e.category,
        location: e.location,
        description: e.description
      }))
    };
  },

  /**
   * Checks full day schedule (both holidays and user events)
   */
  checkDay(userId: string, date: string): DaySummaryResult {
    const holidays = db.getHolidays({ startDate: date, endDate: date });
    const events = db.getEvents(userId, { date });

    // Format date nicely
    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    return {
      queryType: 'day_summary',
      date,
      formattedDate,
      holidays: holidays.map(h => ({ name: h.name, type: h.type })),
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        time: e.allDay ? 'All Day' : (e.startTime ? `${e.startTime}${e.endTime ? ' - ' + e.endTime : ''}` : undefined),
        category: e.category,
        location: e.location
      }))
    };
  },

  /**
   * Full month summary with counts of both events and holidays
   */
  getMonthSummary(userId: string, month: number, year: number): MonthSummaryResult {
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${lastDay}`;

    const holidays = db.getHolidays({ startDate, endDate });
    const events = db.getEvents(userId, { startDate, endDate });

    return {
      queryType: 'month_summary',
      month,
      year,
      monthName: MONTH_NAMES[month - 1],
      holidayCount: holidays.length,
      eventCount: events.length,
      holidays: holidays.map(h => ({ name: h.name, date: h.date, type: h.type })),
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        category: e.category,
        time: e.allDay ? 'All Day' : (e.startTime ? `${e.startTime}${e.endTime ? ' - ' + e.endTime : ''}` : undefined)
      }))
    };
  },

  /**
   * Quick event creation from AI assistant if requested
   */
  createEvent(userId: string, data: { title: string; date: string; startTime?: string; endTime?: string; category?: any; description?: string; location?: string }) {
    return db.createEvent({
      userId,
      title: data.title,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      allDay: !data.startTime,
      category: data.category || 'personal',
      description: data.description,
      location: data.location
    });
  }
};
