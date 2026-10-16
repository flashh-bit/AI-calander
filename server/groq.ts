import Groq from 'groq-sdk';
import { queryLayer } from './queryLayer';
import { db, DbUser, DbHoliday } from './db';

const CURRENT_DATE = '2026-09-22'; // Reference date from system prompt

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'MY_GROQ_API_KEY') {
    return null;
  }
  return new Groq({ apiKey });
}

// Function declarations for Gemini tools
const countHolidaysTool: any = {
  name: 'count_holidays',
  description: 'Compute exact count of public holidays for a given month or year or date range.',
  parameters: {
    type: 'object',
    properties: {
      month: { type: 'integer', description: 'Month number from 1 to 12. For September, use 9.' },
      year: { type: 'integer', description: 'Four-digit year (e.g. 2026).' },
      startDate: { type: 'string', description: 'Optional start date YYYY-MM-DD' },
      endDate: { type: 'string', description: 'Optional end date YYYY-MM-DD' },
    },
  },
};

const getHolidaysTool: any = {
  name: 'get_holidays',
  description: 'Get list of holidays for a specific month, year, or date range.',
  parameters: {
    type: 'object',
    properties: {
      month: { type: 'integer', description: 'Month number (1-12).' },
      year: { type: 'integer', description: 'Four-digit year (e.g. 2026).' },
      startDate: { type: 'string', description: 'Optional start date YYYY-MM-DD' },
      endDate: { type: 'string', description: 'Optional end date YYYY-MM-DD' },
    },
  },
};

const getUserEventsTool: any = {
  name: 'get_user_events',
  description: 'Retrieve real events scheduled by the user on a specific date or date range.',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Specific date YYYY-MM-DD (e.g., 2026-09-15 for the 15th).' },
      startDate: { type: 'string', description: 'Optional start date YYYY-MM-DD' },
      endDate: { type: 'string', description: 'Optional end date YYYY-MM-DD' },
      category: { type: 'string', description: 'Optional category (work, personal, meeting, health, reminder)' },
    },
  },
};

const checkDayTool: any = {
  name: 'check_day_schedule',
  description: 'Check everything scheduled on a specific day: both user events and public holidays.',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'The exact date in YYYY-MM-DD format (e.g. 2026-09-15).' },
    },
    required: ['date'],
  },
};

const getMonthSummaryTool: any = {
  name: 'get_month_summary',
  description: 'Get a full computed summary of the month including count of holidays and count of user events.',
  parameters: {
    type: 'object',
    properties: {
      month: { type: 'integer', description: 'Month number (1-12).' },
      year: { type: 'integer', description: 'Year (e.g. 2026).' },
    },
    required: ['month', 'year'],
  },
};

const getNextHolidayTool: any = {
  name: 'get_next_holiday',
  description: 'Find the very next upcoming public holiday after today.',
  parameters: {
    type: 'object',
    properties: {},
  },
};

const addEventTool: any = {
  name: 'add_calendar_event',
  description: 'Add a new event to the user calendar when they explicitly ask to schedule or add an event.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Title or summary of the event' },
      date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
      startTime: { type: 'string', description: 'Start time in HH:mm (e.g. 14:00)' },
      endTime: { type: 'string', description: 'End time in HH:mm (e.g. 15:00)' },
      category: { type: 'string', description: 'work, personal, meeting, health, or reminder' },
      location: { type: 'string', description: 'Optional event location' },
    },
    required: ['title', 'date'],
  },
};

const tools = [
  
      countHolidaysTool,
      getHolidaysTool,
      getUserEventsTool,
      checkDayTool,
      getMonthSummaryTool,
      getNextHolidayTool,
      addEventTool,
    
].map(tool => ({ type: 'function', function: tool }));

// Helper to resolve dates from relative expressions
function resolveDateFromQuestion(question: string): { date?: string; month?: number; year?: number } {
  const lower = question.toLowerCase();
  const currentYear: number = 2026;
  const currentMonth: number = 9; // September

  // Match "on the 15th", "15th", "on September 15", "15th of september"
  const dayMatch = lower.match(/(?:on\s+the\s+|on\s+|the\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+of\s+([a-z]+))?/);
  if (dayMatch && !lower.includes('how many')) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      let month: number = currentMonth;
      if (dayMatch[2]) {
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const mIdx = months.indexOf(dayMatch[2]);
        if (mIdx !== -1) month = mIdx + 1;
      }
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      return { date: `${currentYear}-${monthStr}-${dayStr}`, month, year: currentYear };
    }
  }

  // Check month mentions
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  for (let i = 0; i < months.length; i++) {
    if (lower.includes(months[i])) {
      return { month: i + 1, year: currentYear };
    }
  }

  if (lower.includes('this month')) {
    return { month: currentMonth, year: currentYear };
  }
  if (lower.includes('next month')) {
    return { month: currentMonth === 12 ? 1 : currentMonth + 1, year: currentMonth === 12 ? currentYear + 1 : currentYear };
  }
  if (lower.includes('today')) {
    return { date: CURRENT_DATE, month: currentMonth, year: currentYear };
  }
  if (lower.includes('tomorrow')) {
    return { date: '2026-09-23', month: currentMonth, year: currentYear };
  }

  return { month: currentMonth, year: currentYear };
}

// Fallback deterministic query engine if Gemini API key is missing or encounters rate limit
function runFallbackQuery(user: DbUser, question: string) {
  const lower = question.toLowerCase();
  const dateInfo = resolveDateFromQuestion(question);

  // 1. Holiday count questions: "how many holidays are there this month?", "how many holidays in october"
  if (lower.includes('how many holiday') || lower.includes('count') && lower.includes('holiday') || (lower.includes('holidays') && lower.includes('how many'))) {
    const month = dateInfo.month || 9;
    const year = dateInfo.year || 2026;
    const res = queryLayer.countHolidays({ month, year });
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const mName = monthNames[month];

    if (res.count === 0) {
      return {
        reply: `There are **no public holidays** in ${mName} ${year}.`,
        queryDetails: { type: 'holiday_count', count: 0, dateRange: `${mName} ${year}`, data: res },
      };
    }

    const listStr = res.holidays.map(h => `• **${h.name}** on ${h.date}`).join('\n');
    return {
      reply: `There ${res.count === 1 ? 'is' : 'are'} **${res.count} public holiday${res.count === 1 ? '' : 's'}** in ${mName} ${year}:\n\n${listStr}`,
      queryDetails: { type: 'holiday_count', count: res.count, dateRange: `${mName} ${year}`, holidays: res.holidays },
    };
  }

  // 2. Specific date questions: "what events do i have on the 15th?", "what's on my schedule today?"
  if (dateInfo.date && (lower.includes('event') || lower.includes('schedule') || lower.includes('do i have') || lower.includes('what is on') || lower.includes('what do i have'))) {
    const daySummary = queryLayer.checkDay(user.id, dateInfo.date);
    let reply = `On **${daySummary.formattedDate}**:`;

    if (daySummary.holidays.length > 0) {
      reply += `\n🎉 **Holiday:** ${daySummary.holidays.map(h => h.name).join(', ')}`;
    }

    if (daySummary.events.length === 0) {
      reply += `\nYou have **no scheduled events** on this day.`;
    } else {
      reply += `\nYou have **${daySummary.events.length} event${daySummary.events.length === 1 ? '' : 's'}**:`;
      daySummary.events.forEach(e => {
        reply += `\n• **${e.title}**${e.time ? ` (${e.time})` : ''}${e.location ? ` @ ${e.location}` : ''}`;
      });
    }

    return {
      reply,
      queryDetails: {
        type: 'day_summary',
        date: dateInfo.date,
        count: daySummary.events.length,
        items: daySummary.events.map(e => ({ title: e.title, date: dateInfo.date!, time: e.time, type: 'event' as const })),
      },
    };
  }

  // 3. Next holiday: "when is the next holiday?"
  if (lower.includes('next holiday') || lower.includes('upcoming holiday')) {
    const next = queryLayer.getNextHoliday(CURRENT_DATE);
    if (!next) {
      return {
        reply: `There are no further holidays scheduled in the system calendar.`,
        queryDetails: { type: 'next_holiday' },
      };
    }
    return {
      reply: `The next public holiday is **${next.name}** on **${next.date}** (${next.type} holiday).`,
      queryDetails: { type: 'next_holiday', data: next },
    };
  }

  // 4. Month summary or "what do i have this month"
  if (lower.includes('this month') || lower.includes('month summary') || lower.includes('schedule this month')) {
    const summary = queryLayer.getMonthSummary(user.id, dateInfo.month || 9, dateInfo.year || 2026);
    let reply = `In **${summary.monthName} ${summary.year}**, you have **${summary.eventCount} event${summary.eventCount === 1 ? '' : 's'}** and there ${summary.holidayCount === 1 ? 'is' : 'are'} **${summary.holidayCount} public holiday${summary.holidayCount === 1 ? '' : 's'}**.\n`;

    if (summary.holidays.length > 0) {
      reply += `\n🎉 **Holidays:** ${summary.holidays.map(h => `${h.name} (${h.date})`).join(', ')}`;
    }
    if (summary.events.length > 0) {
      reply += `\n📅 **Upcoming Events:**\n` + summary.events.slice(0, 5).map(e => `• ${e.date}: ${e.title}${e.time ? ` (${e.time})` : ''}`).join('\n');
      if (summary.events.length > 5) {
        reply += `\n*(and ${summary.events.length - 5} more...)*`;
      }
    }

    return {
      reply,
      queryDetails: { type: 'month_summary', holidayCount: summary.holidayCount, eventCount: summary.eventCount },
    };
  }

  // 4b. Holiday search by name (e.g. "when is diwali", "when is holi", "republic day", "eid")
  const allHols = db.getHolidays({ year: dateInfo.year || 2026 });
  const matchedHoliday = allHols.find((h: DbHoliday) => {
    const cleanLower = lower.replace(/[^a-z0-9\s]/g, ' ');
    const hWords = h.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w: string) => w.length >= 4);
    return hWords.some((w: string) => cleanLower.includes(w)) || cleanLower.includes(h.name.toLowerCase());
  });

  if (matchedHoliday && (lower.includes('when') || lower.includes('date') || lower.includes('holiday') || lower.includes('what') || lower.includes('is'))) {
    const regionLabel = matchedHoliday.country === 'IN' ? '🇮🇳 India' : matchedHoliday.country;
    const kindLabel = matchedHoliday.subType || (matchedHoliday.type === 'holiday' ? 'Public Holiday' : `${matchedHoliday.type} holiday`);
    return {
      reply: `🎉 **${matchedHoliday.name}** in 2026 is on **${matchedHoliday.date}** (${regionLabel} • ${kindLabel}).\n\n${matchedHoliday.description || 'Public holiday.'}`,
      queryDetails: {
        type: 'holiday_detail',
        date: matchedHoliday.date,
        items: [{ title: matchedHoliday.name, date: matchedHoliday.date, type: 'holiday' as const }]
      },
    };
  }

  // 5. General holidays list
  if (lower.includes('holiday') || lower.includes('holidays')) {
    const hols = queryLayer.getHolidays({ month: dateInfo.month, year: dateInfo.year });
    if (hols.total === 0) {
      return {
        reply: `No holidays found for that period.`,
        queryDetails: { type: 'holidays', count: 0 },
      };
    }
    const list = hols.holidays.map(h => `• **${h.name}** — ${h.date}`).join('\n');
    return {
      reply: `Here are the public holidays:\n\n${list}`,
      queryDetails: { type: 'holidays', count: hols.total, holidays: hols.holidays },
    };
  }

  // 6. General fallback: list upcoming events
  const upcomingEvents = queryLayer.getUserEvents(user.id, { startDate: CURRENT_DATE });
  if (upcomingEvents.count > 0) {
    const list = upcomingEvents.events.slice(0, 4).map(e => `• **${e.date}**: ${e.title}${e.time ? ` (${e.time})` : ''}`).join('\n');
    return {
      reply: `I computed your upcoming schedule from today (${CURRENT_DATE}):\n\n${list}\n\nYou can ask me specific questions like: *"How many holidays this month?"* or *"What events do I have on the 15th?"*`,
      queryDetails: { type: 'upcoming_events', count: upcomingEvents.count },
    };
  }

  return {
    reply: `I'm connected to your real calendar data! You can ask me:\n• *"How many holidays are there this month?"*\n• *"What events do I have on the 15th?"*\n• *"When is the next holiday?"*\n• *"What's on my schedule today?"*`,
    queryDetails: { type: 'general' },
  };
}

function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI generation timed out')), ms);
    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function processChatWithAI(
  user: DbUser,
  message: string,
  history: Array<{ sender: 'user' | 'assistant'; text: string }> = []
): Promise<{ reply: string; queryDetails?: any; eventsUpdated?: boolean }> {
  const ai = getGroqClient();

  if (!ai) {
    return runFallbackQuery(user, message);
  }

  try {
    const systemInstruction = `You are an intelligent calendar AI assistant for a calendar web app.
The current date is Tuesday, September 22, 2026 (2026-09-22).
The currently authenticated user is ${user.name} (email: ${user.email}, ID: ${user.id}).

CRITICAL INSTRUCTIONS:
1. You MUST call tools to retrieve REAL calendar data before answering questions about holidays, schedules, or events.
2. NEVER guess, invent, or hallucinate event or holiday dates or counts.
3. For questions like "How many holidays are there this month?" or "Any holidays in October?", call 'count_holidays' or 'get_holidays' with month and year.
4. For questions like "What events do I have on the 15th?", call 'check_day_schedule' or 'get_user_events' with date="2026-09-15".
5. For "today", reference date is 2026-09-22.
6. When the user asks to schedule an event (e.g. "Add a team sync on Friday at 2pm"), call 'add_calendar_event'.
7. After receiving tool output, respond warmly and clearly with the exact computed facts. Mention the count and specific titles/dates computed. Format nicely with markdown bolding and bullet points.`;

    const messages: any[] = [{ role: 'system', content: systemInstruction }];
    history.slice(-6).forEach(h => {
      messages.push({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: h.text,
      });
    });
    messages.push({
      role: 'user',
      content: message,
    });

    const response1 = await withTimeout(ai.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages,
      temperature: 0.2,
      tools: tools as any,
    }), 12000);

    const responseMessage = response1.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      let eventsUpdated = false;
      let queryDetails: any = null;

      messages.push(responseMessage);

      for (const call of toolCalls) {
        const name = call.function.name;
        const args = JSON.parse(call.function.arguments);
        let result: any = null;

        if (name === 'count_holidays') {
          const filter = {
            month: args.month ?? 9,
            year: args.year ?? 2026,
            startDate: args.startDate,
            endDate: args.endDate,
          };
          result = queryLayer.countHolidays(filter);
          queryDetails = result;
        } else if (name === 'get_holidays') {
          const filter = {
            month: args.month,
            year: args.year ?? 2026,
            startDate: args.startDate,
            endDate: args.endDate,
          };
          result = queryLayer.getHolidays(filter);
          queryDetails = result;
        } else if (name === 'get_user_events') {
          result = queryLayer.getUserEvents(user.id, args as any);
          queryDetails = result;
        } else if (name === 'check_day_schedule') {
          const date = args.date || CURRENT_DATE;
          result = queryLayer.checkDay(user.id, date);
          queryDetails = result;
        } else if (name === 'get_month_summary') {
          const m = args.month ?? 9;
          const y = args.year ?? 2026;
          result = queryLayer.getMonthSummary(user.id, m, y);
          queryDetails = result;
        } else if (name === 'get_next_holiday') {
          result = queryLayer.getNextHoliday(CURRENT_DATE);
          queryDetails = { type: 'next_holiday', data: result };
        } else if (name === 'add_calendar_event') {
          const created = queryLayer.createEvent(user.id, args as any);
          result = { success: true, event: created };
          eventsUpdated = true;
          queryDetails = { type: 'event_created', event: created };
        } else {
          result = { error: 'Unknown tool call' };
        }

        messages.push({
          tool_call_id: call.id,
          role: 'tool',
          name: name,
          content: JSON.stringify(result),
        });
      }

      const response2 = await withTimeout(ai.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.3,
      }), 12000);

      return {
        reply: response2.choices[0].message.content || 'I computed the details from your calendar.',
        queryDetails,
        eventsUpdated,
      };
    }

    return {
      reply: responseMessage.content || runFallbackQuery(user, message).reply,
      queryDetails: null,
    };
  } catch (err) {
    console.log('AI generation note (using local query engine):', (err as any)?.message || err);
    return runFallbackQuery(user, message);
  }
}
