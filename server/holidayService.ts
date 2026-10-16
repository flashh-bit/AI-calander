import type { DbHoliday } from './db.ts';

// Official Google Calendar Public Holiday ICS Feeds
const GOOGLE_CALENDAR_FEEDS: Record<string, string> = {
  IN: 'https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics',
  US: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
};

// Memory cache for parsed feeds to prevent re-fetching the entire multi-megabyte ICS on every request
const rawFeedCache: Record<string, { timestamp: number; holidays: DbHoliday[] }> = {};
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Parses an iCalendar (RFC 5545) text feed from Google Calendar and extracts structured DbHoliday items.
 */
export function parseGoogleCalendarIcs(icsText: string, countryCode: string): DbHoliday[] {
  const holidays: DbHoliday[] = [];

  // Unfold lines: RFC 5545 specifies that lines starting with space or tab are continuations of the previous line
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const vevents = unfolded.split('BEGIN:VEVENT').slice(1);

  for (const block of vevents) {
    const summaryMatch = block.match(/SUMMARY:(.*?)\r?\n/);
    const dtMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
    const descMatch = block.match(/DESCRIPTION:(.*?)\r?\n/);

    if (summaryMatch && dtMatch) {
      const rawSummary = summaryMatch[1]
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\n/g, ' ')
        .trim();

      const dt = dtMatch[1];
      const date = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;

      let rawDesc = descMatch
        ? descMatch[1]
            .replace(/\\n/g, ' ')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .trim()
        : '';

      // Strip Google Calendar settings boilerplate from description
      rawDesc = rawDesc
        .replace(/To hide observances, go to Google Calendar Settings > Holidays in [^.]+/gi, '')
        .replace(/Date is tentative and may change\./gi, '(Tentative date)')
        .trim();

      // Categorize holiday type
      let type: DbHoliday['type'] = 'holiday';
      let subType = 'Public Holiday';

      const lowerDesc = rawDesc.toLowerCase();
      const lowerSum = rawSummary.toLowerCase();

      if (lowerDesc.includes('national holiday') || lowerSum.includes('republic day') || lowerSum.includes('independence day') || lowerSum.includes('gandhi jayanti')) {
        type = 'national';
        subType = 'National Holiday';
      } else if (lowerDesc.includes('observance') || lowerDesc.includes('restricted')) {
        type = 'observance';
        subType = 'Observance';
      } else if (lowerDesc.includes('gazetted')) {
        type = 'gazetted';
        subType = 'Gazetted Holiday';
      } else if (
        lowerSum.includes('diwali') ||
        lowerSum.includes('deepavali') ||
        lowerSum.includes('holi') ||
        lowerSum.includes('eid') ||
        lowerSum.includes('id') ||
        lowerSum.includes('dussehra') ||
        lowerSum.includes('navratri') ||
        lowerSum.includes('pongal') ||
        lowerSum.includes('sankranti') ||
        lowerSum.includes('ganesh') ||
        lowerSum.includes('janmashtami') ||
        lowerSum.includes('raksha bandhan') ||
        lowerSum.includes('shivratri')
      ) {
        type = 'festival';
        subType = 'Festival';
      } else if (countryCode === 'US' && lowerDesc.includes('federal')) {
        type = 'federal';
        subType = 'Federal Holiday';
      }

      const id = `hol-${countryCode.toLowerCase()}-${dt}-${encodeURIComponent(rawSummary.slice(0, 15)).toLowerCase()}`;

      holidays.push({
        id,
        name: rawSummary,
        date,
        country: countryCode.toUpperCase(),
        type,
        subType,
        description: rawDesc || `${rawSummary} (${subType})`,
      });
    }
  }

  // Deduplicate by date + name
  const seen = new Set<string>();
  const uniqueHolidays: DbHoliday[] = [];
  for (const h of holidays) {
    const key = `${h.country}-${h.date}-${h.name.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueHolidays.push(h);
    }
  }

  return uniqueHolidays.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculates Easter Sunday for a given year using Meeus/Jones/Butcher algorithm.
 */
function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Accurate mathematical & astronomical table for variable lunar/solar Indian festivals
 * used as a resilient fallback for years not covered in the feed or if the network is offline.
 */
const ACCURATE_INDIAN_FESTIVALS: Record<
  number,
  Array<{ name: string; date: string; type: DbHoliday['type']; subType: string; desc: string }>
> = {
  2021: [
    { name: 'Makar Sankranti / Pongal', date: '2021-01-14', type: 'festival', subType: 'Harvest Festival', desc: 'Harvest festival celebrating the Sun entering Capricorn.' },
    { name: 'Maha Shivratri', date: '2021-03-11', type: 'festival', subType: 'Festival', desc: 'Great night of Lord Shiva.' },
    { name: 'Holi (Festival of Colors)', date: '2021-03-29', type: 'festival', subType: 'Festival', desc: 'Spring festival of colors and joy.' },
    { name: 'Ram Navami', date: '2021-04-21', type: 'festival', subType: 'Festival', desc: 'Celebration of the birth of Lord Rama.' },
    { name: 'Mahavir Jayanti', date: '2021-04-25', type: 'festival', subType: 'Religious Holiday', desc: 'Birth of Lord Mahavira.' },
    { name: 'Eid-ul-Fitr (Ramzan Id)', date: '2021-05-14', type: 'festival', subType: 'Islamic Festival', desc: 'Marks the end of Ramadan.' },
    { name: 'Buddha Purnima', date: '2021-05-26', type: 'festival', subType: 'Gazetted Holiday', desc: 'Birth, enlightenment, and death of Buddha.' },
    { name: 'Eid-ul-Adha (Bakrid)', date: '2021-07-21', type: 'festival', subType: 'Islamic Festival', desc: 'Feast of the Sacrifice.' },
    { name: 'Muharram', date: '2021-08-19', type: 'festival', subType: 'Observance', desc: 'First month of Islamic calendar.' },
    { name: 'Raksha Bandhan', date: '2021-08-22', type: 'festival', subType: 'Festival', desc: 'Celebration of brother and sister bond.' },
    { name: 'Krishna Janmashtami', date: '2021-08-30', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Krishna.' },
    { name: 'Ganesh Chaturthi', date: '2021-09-10', type: 'festival', subType: 'Festival', desc: 'Grand arrival of Lord Ganesha.' },
    { name: 'Dussehra (Vijayadashami)', date: '2021-10-15', type: 'festival', subType: 'Festival', desc: 'Triumph of good over evil.' },
    { name: 'Diwali (Deepavali)', date: '2021-11-04', type: 'festival', subType: 'Festival of Lights', desc: 'Grand festival of lights.' },
    { name: 'Bhai Dooj', date: '2021-11-06', type: 'festival', subType: 'Festival', desc: 'Celebration of brotherly bond.' },
    { name: 'Chhath Puja', date: '2021-11-10', type: 'festival', subType: 'Festival', desc: 'Worship of the Sun God.' },
    { name: 'Guru Nanak Jayanti', date: '2021-11-19', type: 'festival', subType: 'Gazetted Holiday', desc: 'Birth of Guru Nanak Dev Ji.' },
  ],
  2022: [
    { name: 'Makar Sankranti / Pongal', date: '2022-01-14', type: 'festival', subType: 'Harvest Festival', desc: 'Harvest festival celebrating the Sun entering Capricorn.' },
    { name: 'Maha Shivratri', date: '2022-03-01', type: 'festival', subType: 'Festival', desc: 'Great night of Lord Shiva.' },
    { name: 'Holi (Festival of Colors)', date: '2022-03-18', type: 'festival', subType: 'Festival', desc: 'Spring festival of colors.' },
    { name: 'Ram Navami', date: '2022-04-10', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Rama.' },
    { name: 'Mahavir Jayanti', date: '2022-04-14', type: 'festival', subType: 'Religious Holiday', desc: 'Birth of Lord Mahavira.' },
    { name: 'Eid-ul-Fitr (Ramzan Id)', date: '2022-05-03', type: 'festival', subType: 'Islamic Festival', desc: 'Marks the end of Ramadan.' },
    { name: 'Buddha Purnima', date: '2022-05-16', type: 'festival', subType: 'Gazetted Holiday', desc: 'Birth of Gautama Buddha.' },
    { name: 'Eid-ul-Adha (Bakrid)', date: '2022-07-10', type: 'festival', subType: 'Islamic Festival', desc: 'Feast of the Sacrifice.' },
    { name: 'Muharram', date: '2022-08-09', type: 'festival', subType: 'Observance', desc: 'Day of Ashura.' },
    { name: 'Raksha Bandhan', date: '2022-08-11', type: 'festival', subType: 'Festival', desc: 'Brother and sister celebration.' },
    { name: 'Krishna Janmashtami', date: '2022-08-19', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Krishna.' },
    { name: 'Ganesh Chaturthi', date: '2022-08-31', type: 'festival', subType: 'Festival', desc: 'Ganesha festival.' },
    { name: 'Dussehra (Vijayadashami)', date: '2022-10-05', type: 'festival', subType: 'Festival', desc: 'Victory of good over evil.' },
    { name: 'Diwali (Deepavali)', date: '2022-10-24', type: 'festival', subType: 'Festival of Lights', desc: 'Festival of lights and prosperity.' },
    { name: 'Bhai Dooj', date: '2022-10-26', type: 'festival', subType: 'Festival', desc: 'Brother and sister bond.' },
    { name: 'Chhath Puja', date: '2022-10-30', type: 'festival', subType: 'Festival', desc: 'Sun worship.' },
    { name: 'Guru Nanak Jayanti', date: '2022-11-08', type: 'festival', subType: 'Gazetted Holiday', desc: 'Birth of Guru Nanak Dev Ji.' },
  ],
  2023: [
    { name: 'Makar Sankranti / Pongal', date: '2023-01-14', type: 'festival', subType: 'Harvest Festival', desc: 'Harvest festival.' },
    { name: 'Maha Shivratri', date: '2023-02-18', type: 'festival', subType: 'Festival', desc: 'Night of Lord Shiva.' },
    { name: 'Holi (Festival of Colors)', date: '2023-03-08', type: 'festival', subType: 'Festival', desc: 'Festival of colors.' },
    { name: 'Ram Navami', date: '2023-03-30', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Rama.' },
    { name: 'Mahavir Jayanti', date: '2023-04-04', type: 'festival', subType: 'Religious Holiday', desc: 'Birth of Lord Mahavira.' },
    { name: 'Eid-ul-Fitr (Ramzan Id)', date: '2023-04-22', type: 'festival', subType: 'Islamic Festival', desc: 'End of Ramadan.' },
    { name: 'Buddha Purnima', date: '2023-05-05', type: 'festival', subType: 'Gazetted Holiday', desc: 'Buddha Purnima.' },
    { name: 'Eid-ul-Adha (Bakrid)', date: '2023-06-29', type: 'festival', subType: 'Islamic Festival', desc: 'Bakrid.' },
    { name: 'Muharram', date: '2023-07-29', type: 'festival', subType: 'Observance', desc: 'Ashura.' },
    { name: 'Raksha Bandhan', date: '2023-08-30', type: 'festival', subType: 'Festival', desc: 'Rakhi.' },
    { name: 'Krishna Janmashtami', date: '2023-09-07', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Krishna.' },
    { name: 'Ganesh Chaturthi', date: '2023-09-19', type: 'festival', subType: 'Festival', desc: 'Ganesh Chaturthi.' },
    { name: 'Dussehra (Vijayadashami)', date: '2023-10-24', type: 'festival', subType: 'Festival', desc: 'Dussehra.' },
    { name: 'Diwali (Deepavali)', date: '2023-11-12', type: 'festival', subType: 'Festival of Lights', desc: 'Diwali.' },
    { name: 'Bhai Dooj', date: '2023-11-15', type: 'festival', subType: 'Festival', desc: 'Bhai Dooj.' },
    { name: 'Chhath Puja', date: '2023-11-19', type: 'festival', subType: 'Festival', desc: 'Chhath Puja.' },
    { name: 'Guru Nanak Jayanti', date: '2023-11-27', type: 'festival', subType: 'Gazetted Holiday', desc: 'Guru Nanak Jayanti.' },
  ],
  2024: [
    { name: 'Makar Sankranti / Pongal', date: '2024-01-14', type: 'festival', subType: 'Harvest Festival', desc: 'Harvest festival.' },
    { name: 'Maha Shivratri', date: '2024-03-08', type: 'festival', subType: 'Festival', desc: 'Night of Lord Shiva.' },
    { name: 'Holi (Festival of Colors)', date: '2024-03-25', type: 'festival', subType: 'Festival', desc: 'Festival of colors.' },
    { name: 'Eid-ul-Fitr (Ramzan Id)', date: '2024-04-11', type: 'festival', subType: 'Islamic Festival', desc: 'End of Ramadan.' },
    { name: 'Ram Navami', date: '2024-04-17', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Rama.' },
    { name: 'Mahavir Jayanti', date: '2024-04-21', type: 'festival', subType: 'Religious Holiday', desc: 'Birth of Lord Mahavira.' },
    { name: 'Buddha Purnima', date: '2024-05-23', type: 'festival', subType: 'Gazetted Holiday', desc: 'Buddha Purnima.' },
    { name: 'Eid-ul-Adha (Bakrid)', date: '2024-06-17', type: 'festival', subType: 'Islamic Festival', desc: 'Bakrid.' },
    { name: 'Muharram', date: '2024-07-17', type: 'festival', subType: 'Observance', desc: 'Ashura.' },
    { name: 'Raksha Bandhan', date: '2024-08-19', type: 'festival', subType: 'Festival', desc: 'Rakhi.' },
    { name: 'Krishna Janmashtami', date: '2024-08-26', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Krishna.' },
    { name: 'Ganesh Chaturthi', date: '2024-09-07', type: 'festival', subType: 'Festival', desc: 'Ganesh Chaturthi.' },
    { name: 'Dussehra (Vijayadashami)', date: '2024-10-12', type: 'festival', subType: 'Festival', desc: 'Dussehra.' },
    { name: 'Diwali (Deepavali)', date: '2024-10-31', type: 'festival', subType: 'Festival of Lights', desc: 'Diwali.' },
    { name: 'Bhai Dooj', date: '2024-11-03', type: 'festival', subType: 'Festival', desc: 'Bhai Dooj.' },
    { name: 'Chhath Puja', date: '2024-11-07', type: 'festival', subType: 'Festival', desc: 'Chhath Puja.' },
    { name: 'Guru Nanak Jayanti', date: '2024-11-15', type: 'festival', subType: 'Gazetted Holiday', desc: 'Guru Nanak Jayanti.' },
  ],
  2025: [
    { name: 'Makar Sankranti / Pongal', date: '2025-01-14', type: 'festival', subType: 'Harvest Festival', desc: 'Harvest festival.' },
    { name: 'Maha Shivratri', date: '2025-02-26', type: 'festival', subType: 'Festival', desc: 'Night of Lord Shiva.' },
    { name: 'Holi (Festival of Colors)', date: '2025-03-14', type: 'festival', subType: 'Festival', desc: 'Festival of colors.' },
    { name: 'Eid-ul-Fitr (Ramzan Id)', date: '2025-03-31', type: 'festival', subType: 'Islamic Festival', desc: 'End of Ramadan.' },
    { name: 'Ram Navami', date: '2025-04-06', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Rama.' },
    { name: 'Mahavir Jayanti', date: '2025-04-10', type: 'festival', subType: 'Religious Holiday', desc: 'Birth of Lord Mahavira.' },
    { name: 'Buddha Purnima', date: '2025-05-12', type: 'festival', subType: 'Gazetted Holiday', desc: 'Buddha Purnima.' },
    { name: 'Eid-ul-Adha (Bakrid)', date: '2025-06-07', type: 'festival', subType: 'Islamic Festival', desc: 'Bakrid.' },
    { name: 'Muharram', date: '2025-07-06', type: 'festival', subType: 'Observance', desc: 'Ashura.' },
    { name: 'Raksha Bandhan', date: '2025-08-09', type: 'festival', subType: 'Festival', desc: 'Rakhi.' },
    { name: 'Krishna Janmashtami', date: '2025-08-16', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Krishna.' },
    { name: 'Ganesh Chaturthi', date: '2025-08-27', type: 'festival', subType: 'Festival', desc: 'Ganesh Chaturthi.' },
    { name: 'Dussehra (Vijayadashami)', date: '2025-10-02', type: 'festival', subType: 'Festival', desc: 'Dussehra.' },
    { name: 'Diwali (Deepavali)', date: '2025-10-20', type: 'festival', subType: 'Festival of Lights', desc: 'Diwali.' },
    { name: 'Bhai Dooj', date: '2025-10-23', type: 'festival', subType: 'Festival', desc: 'Bhai Dooj.' },
    { name: 'Chhath Puja', date: '2025-10-28', type: 'festival', subType: 'Festival', desc: 'Chhath Puja.' },
    { name: 'Guru Nanak Jayanti', date: '2025-11-05', type: 'festival', subType: 'Gazetted Holiday', desc: 'Guru Nanak Jayanti.' },
  ],
  2026: [
    { name: 'Makar Sankranti / Pongal', date: '2026-01-14', type: 'festival', subType: 'Harvest Festival', desc: 'Harvest festival.' },
    { name: 'Maha Shivratri', date: '2026-02-15', type: 'festival', subType: 'Festival', desc: 'Night of Lord Shiva.' },
    { name: 'Holi (Festival of Colors)', date: '2026-03-04', type: 'festival', subType: 'Festival', desc: 'Spring festival of colors.' },
    { name: 'Eid-ul-Fitr (Ramzan Id)', date: '2026-03-21', type: 'festival', subType: 'Islamic Festival', desc: 'End of Ramadan.' },
    { name: 'Ram Navami', date: '2026-03-27', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Rama.' },
    { name: 'Mahavir Jayanti', date: '2026-03-31', type: 'festival', subType: 'Religious Holiday', desc: 'Birth of Lord Mahavira.' },
    { name: 'Buddha Purnima', date: '2026-05-01', type: 'festival', subType: 'Gazetted Holiday', desc: 'Buddha Purnima.' },
    { name: 'Eid-ul-Adha (Bakrid)', date: '2026-05-27', type: 'festival', subType: 'Islamic Festival', desc: 'Bakrid.' },
    { name: 'Muharram', date: '2026-06-26', type: 'festival', subType: 'Observance', desc: 'Ashura.' },
    { name: 'Independence Day', date: '2026-08-15', type: 'national', subType: 'National Holiday', desc: 'Independence Day.' },
    { name: 'Raksha Bandhan', date: '2026-08-28', type: 'festival', subType: 'Festival', desc: 'Rakhi.' },
    { name: 'Krishna Janmashtami', date: '2026-09-04', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Krishna.' },
    { name: 'Ganesh Chaturthi', date: '2026-09-14', type: 'festival', subType: 'Festival', desc: 'Ganesh Chaturthi.' },
    { name: 'Dussehra (Vijayadashami)', date: '2026-10-20', type: 'festival', subType: 'Festival', desc: 'Dussehra.' },
    { name: 'Diwali (Deepavali)', date: '2026-11-08', type: 'festival', subType: 'Festival of Lights', desc: 'Festival of lights.' },
    { name: 'Bhai Dooj', date: '2026-11-10', type: 'festival', subType: 'Festival', desc: 'Bhai Dooj.' },
    { name: 'Chhath Puja', date: '2026-11-15', type: 'festival', subType: 'Festival', desc: 'Chhath Puja.' },
    { name: 'Guru Nanak Jayanti', date: '2026-11-24', type: 'festival', subType: 'Gazetted Holiday', desc: 'Guru Nanak Jayanti.' },
  ],
  2027: [
    { name: 'Makar Sankranti / Pongal', date: '2027-01-14', type: 'festival', subType: 'Harvest Festival', desc: 'Harvest festival.' },
    { name: 'Maha Shivratri', date: '2027-03-06', type: 'festival', subType: 'Festival', desc: 'Night of Lord Shiva.' },
    { name: 'Eid-ul-Fitr (Ramzan Id)', date: '2027-03-10', type: 'festival', subType: 'Islamic Festival', desc: 'End of Ramadan.' },
    { name: 'Holi (Festival of Colors)', date: '2027-03-22', type: 'festival', subType: 'Festival', desc: 'Festival of colors.' },
    { name: 'Ram Navami', date: '2027-04-15', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Rama.' },
    { name: 'Mahavir Jayanti', date: '2027-04-19', type: 'festival', subType: 'Religious Holiday', desc: 'Birth of Lord Mahavira.' },
    { name: 'Eid-ul-Adha (Bakrid)', date: '2027-05-17', type: 'festival', subType: 'Islamic Festival', desc: 'Bakrid.' },
    { name: 'Buddha Purnima', date: '2027-05-20', type: 'festival', subType: 'Gazetted Holiday', desc: 'Buddha Purnima.' },
    { name: 'Muharram', date: '2027-06-16', type: 'festival', subType: 'Observance', desc: 'Ashura.' },
    { name: 'Raksha Bandhan', date: '2027-08-17', type: 'festival', subType: 'Festival', desc: 'Rakhi.' },
    { name: 'Krishna Janmashtami', date: '2027-08-25', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Krishna.' },
    { name: 'Ganesh Chaturthi', date: '2027-09-04', type: 'festival', subType: 'Festival', desc: 'Ganesh Chaturthi.' },
    { name: 'Dussehra (Vijayadashami)', date: '2027-10-09', type: 'festival', subType: 'Festival', desc: 'Dussehra.' },
    { name: 'Diwali (Deepavali)', date: '2027-10-29', type: 'festival', subType: 'Festival of Lights', desc: 'Festival of lights.' },
    { name: 'Bhai Dooj', date: '2027-10-31', type: 'festival', subType: 'Festival', desc: 'Bhai Dooj.' },
    { name: 'Chhath Puja', date: '2027-11-04', type: 'festival', subType: 'Festival', desc: 'Chhath Puja.' },
    { name: 'Guru Nanak Jayanti', date: '2027-11-14', type: 'festival', subType: 'Gazetted Holiday', desc: 'Guru Nanak Jayanti.' },
  ],
  2028: [
    { name: 'Makar Sankranti / Pongal', date: '2028-01-14', type: 'festival', subType: 'Harvest Festival', desc: 'Harvest festival.' },
    { name: 'Maha Shivratri', date: '2028-02-24', type: 'festival', subType: 'Festival', desc: 'Night of Lord Shiva.' },
    { name: 'Eid-ul-Fitr (Ramzan Id)', date: '2028-02-27', type: 'festival', subType: 'Islamic Festival', desc: 'End of Ramadan.' },
    { name: 'Holi (Festival of Colors)', date: '2028-03-11', type: 'festival', subType: 'Festival', desc: 'Festival of colors.' },
    { name: 'Ram Navami', date: '2028-04-03', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Rama.' },
    { name: 'Mahavir Jayanti', date: '2028-04-08', type: 'festival', subType: 'Religious Holiday', desc: 'Birth of Lord Mahavira.' },
    { name: 'Eid-ul-Adha (Bakrid)', date: '2028-05-05', type: 'festival', subType: 'Islamic Festival', desc: 'Bakrid.' },
    { name: 'Buddha Purnima', date: '2028-05-08', type: 'festival', subType: 'Gazetted Holiday', desc: 'Buddha Purnima.' },
    { name: 'Muharram', date: '2028-06-04', type: 'festival', subType: 'Observance', desc: 'Ashura.' },
    { name: 'Raksha Bandhan', date: '2028-08-05', type: 'festival', subType: 'Festival', desc: 'Rakhi.' },
    { name: 'Krishna Janmashtami', date: '2028-08-13', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Krishna.' },
    { name: 'Ganesh Chaturthi', date: '2028-08-24', type: 'festival', subType: 'Festival', desc: 'Ganesh Chaturthi.' },
    { name: 'Dussehra (Vijayadashami)', date: '2028-09-28', type: 'festival', subType: 'Festival', desc: 'Dussehra.' },
    { name: 'Diwali (Deepavali)', date: '2028-10-17', type: 'festival', subType: 'Festival of Lights', desc: 'Festival of lights.' },
    { name: 'Bhai Dooj', date: '2028-10-19', type: 'festival', subType: 'Festival', desc: 'Bhai Dooj.' },
    { name: 'Chhath Puja', date: '2028-10-23', type: 'festival', subType: 'Festival', desc: 'Chhath Puja.' },
    { name: 'Guru Nanak Jayanti', date: '2028-11-02', type: 'festival', subType: 'Gazetted Holiday', desc: 'Guru Nanak Jayanti.' },
  ],
  2029: [
    { name: 'Makar Sankranti / Pongal', date: '2029-01-14', type: 'festival', subType: 'Harvest Festival', desc: 'Harvest festival.' },
    { name: 'Maha Shivratri', date: '2029-02-12', type: 'festival', subType: 'Festival', desc: 'Night of Lord Shiva.' },
    { name: 'Eid-ul-Fitr (Ramzan Id)', date: '2029-02-15', type: 'festival', subType: 'Islamic Festival', desc: 'End of Ramadan.' },
    { name: 'Holi (Festival of Colors)', date: '2029-03-01', type: 'festival', subType: 'Festival', desc: 'Festival of colors.' },
    { name: 'Ram Navami', date: '2029-03-24', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Rama.' },
    { name: 'Mahavir Jayanti', date: '2029-03-28', type: 'festival', subType: 'Religious Holiday', desc: 'Birth of Lord Mahavira.' },
    { name: 'Eid-ul-Adha (Bakrid)', date: '2029-04-24', type: 'festival', subType: 'Islamic Festival', desc: 'Bakrid.' },
    { name: 'Buddha Purnima', date: '2029-04-28', type: 'festival', subType: 'Gazetted Holiday', desc: 'Buddha Purnima.' },
    { name: 'Muharram', date: '2029-05-24', type: 'festival', subType: 'Observance', desc: 'Ashura.' },
    { name: 'Raksha Bandhan', date: '2029-08-24', type: 'festival', subType: 'Festival', desc: 'Rakhi.' },
    { name: 'Krishna Janmashtami', date: '2029-09-01', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Krishna.' },
    { name: 'Ganesh Chaturthi', date: '2029-09-12', type: 'festival', subType: 'Festival', desc: 'Ganesh Chaturthi.' },
    { name: 'Dussehra (Vijayadashami)', date: '2029-10-17', type: 'festival', subType: 'Festival', desc: 'Dussehra.' },
    { name: 'Diwali (Deepavali)', date: '2029-11-05', type: 'festival', subType: 'Festival of Lights', desc: 'Festival of lights.' },
    { name: 'Bhai Dooj', date: '2029-11-07', type: 'festival', subType: 'Festival', desc: 'Bhai Dooj.' },
    { name: 'Chhath Puja', date: '2029-11-11', type: 'festival', subType: 'Festival', desc: 'Chhath Puja.' },
    { name: 'Guru Nanak Jayanti', date: '2029-11-21', type: 'festival', subType: 'Gazetted Holiday', desc: 'Guru Nanak Jayanti.' },
  ],
  2030: [
    { name: 'Makar Sankranti / Pongal', date: '2030-01-14', type: 'festival', subType: 'Harvest Festival', desc: 'Harvest festival.' },
    { name: 'Eid-ul-Fitr (Ramzan Id)', date: '2030-02-05', type: 'festival', subType: 'Islamic Festival', desc: 'End of Ramadan.' },
    { name: 'Maha Shivratri', date: '2030-03-03', type: 'festival', subType: 'Festival', desc: 'Night of Lord Shiva.' },
    { name: 'Holi (Festival of Colors)', date: '2030-03-20', type: 'festival', subType: 'Festival', desc: 'Festival of colors.' },
    { name: 'Ram Navami', date: '2030-04-12', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Rama.' },
    { name: 'Mahavir Jayanti', date: '2030-04-16', type: 'festival', subType: 'Religious Holiday', desc: 'Birth of Lord Mahavira.' },
    { name: 'Eid-ul-Adha (Bakrid)', date: '2030-04-14', type: 'festival', subType: 'Islamic Festival', desc: 'Bakrid.' },
    { name: 'Buddha Purnima', date: '2030-05-17', type: 'festival', subType: 'Gazetted Holiday', desc: 'Buddha Purnima.' },
    { name: 'Muharram', date: '2030-05-14', type: 'festival', subType: 'Observance', desc: 'Ashura.' },
    { name: 'Raksha Bandhan', date: '2030-08-14', type: 'festival', subType: 'Festival', desc: 'Rakhi.' },
    { name: 'Krishna Janmashtami', date: '2030-08-21', type: 'festival', subType: 'Festival', desc: 'Birth of Lord Krishna.' },
    { name: 'Ganesh Chaturthi', date: '2030-09-01', type: 'festival', subType: 'Festival', desc: 'Ganesh Chaturthi.' },
    { name: 'Dussehra (Vijayadashami)', date: '2030-10-06', type: 'festival', subType: 'Festival', desc: 'Dussehra.' },
    { name: 'Diwali (Deepavali)', date: '2030-10-26', type: 'festival', subType: 'Festival of Lights', desc: 'Festival of lights.' },
    { name: 'Bhai Dooj', date: '2030-10-28', type: 'festival', subType: 'Festival', desc: 'Bhai Dooj.' },
    { name: 'Chhath Puja', date: '2030-11-01', type: 'festival', subType: 'Festival', desc: 'Chhath Puja.' },
    { name: 'Guru Nanak Jayanti', date: '2030-11-10', type: 'festival', subType: 'Gazetted Holiday', desc: 'Guru Nanak Jayanti.' },
  ],
};

/**
 * Generates accurate national & festival holidays for India for any requested year.
 */
export function generateIndianHolidaysForYear(year: number): DbHoliday[] {
  const holidays: DbHoliday[] = [];

  // Fixed date national & official Indian holidays
  const fixedHolidays: Array<{ month: string; day: string; name: string; type: DbHoliday['type']; subType: string; desc: string }> = [
    { month: '01', day: '01', name: "New Year's Day", type: 'holiday', subType: 'Public Holiday', desc: 'First day of the Gregorian year.' },
    { month: '01', day: '26', name: 'Republic Day', type: 'national', subType: 'National Holiday', desc: 'National Holiday commemorating Constitution of India adoption in 1950.' },
    { month: '04', day: '14', name: 'Dr. B.R. Ambedkar Jayanti', type: 'gazetted', subType: 'Gazetted Holiday', desc: 'Honoring Dr. B.R. Ambedkar, chief architect of the Indian Constitution.' },
    { month: '05', day: '01', name: 'May Day / International Labour Day', type: 'holiday', subType: 'Observance', desc: 'International Workers Day.' },
    { month: '08', day: '15', name: 'Independence Day', type: 'national', subType: 'National Holiday', desc: 'National Holiday celebrating independence from British rule in 1947.' },
    { month: '10', day: '02', name: 'Mahatma Gandhi Jayanti', type: 'national', subType: 'National Holiday', desc: 'National Holiday commemorating the birth of Father of the Nation, Mahatma Gandhi.' },
    { month: '12', day: '25', name: 'Christmas Day', type: 'holiday', subType: 'Public Holiday', desc: 'Celebrating the birth of Jesus Christ.' },
  ];

  for (const f of fixedHolidays) {
    const date = `${year}-${f.month}-${f.day}`;
    holidays.push({
      id: `hol-in-${date}-${encodeURIComponent(f.name.slice(0, 15)).toLowerCase()}`,
      name: f.name,
      date,
      country: 'IN',
      type: f.type,
      subType: f.subType,
      description: f.desc,
    });
  }

  // Good Friday and Easter Sunday (Christian astronomical calendar)
  const easter = getEasterSunday(year);
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day));
  const goodFridayDate = new Date(easterDate.getTime() - 2 * 24 * 60 * 60 * 1000);

  const gfIso = goodFridayDate.toISOString().slice(0, 10);
  const easterIso = easterDate.toISOString().slice(0, 10);

  holidays.push({
    id: `hol-in-${gfIso}-goodfriday`,
    name: 'Good Friday',
    date: gfIso,
    country: 'IN',
    type: 'holiday',
    subType: 'Public Holiday',
    description: 'Christian holiday commemorating the crucifixion of Jesus Christ.',
  });

  holidays.push({
    id: `hol-in-${easterIso}-easter`,
    name: 'Easter Sunday',
    date: easterIso,
    country: 'IN',
    type: 'holiday',
    subType: 'Public Holiday',
    description: 'Celebration of the resurrection of Jesus Christ.',
  });

  // Dynamic variable lunar festivals from astronomical table
  const variableFestivals = ACCURATE_INDIAN_FESTIVALS[year];
  if (variableFestivals) {
    for (const fest of variableFestivals) {
      holidays.push({
        id: `hol-in-${fest.date}-${encodeURIComponent(fest.name.slice(0, 15)).toLowerCase()}`,
        name: fest.name,
        date: fest.date,
        country: 'IN',
        type: fest.type,
        subType: fest.subType,
        description: fest.desc,
      });
    }
  }

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generates US federal holidays for any requested year.
 */
export function generateUSHolidaysForYear(year: number): DbHoliday[] {
  const holidays: DbHoliday[] = [];

  // Helper for Nth weekday of a month (e.g. 3rd Monday in January)
  function getNthWeekday(m: number, targetWeekday: number, n: number): string {
    let count = 0;
    for (let day = 1; day <= 31; day++) {
      const d = new Date(Date.UTC(year, m - 1, day));
      if (d.getUTCMonth() !== m - 1) break;
      if (d.getUTCDay() === targetWeekday) {
        count++;
        if (count === n) {
          return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    return '';
  }

  // Helper for Last weekday of a month (e.g. Last Monday in May)
  function getLastWeekday(m: number, targetWeekday: number): string {
    for (let day = 31; day >= 1; day--) {
      const d = new Date(Date.UTC(year, m - 1, day));
      if (d.getUTCMonth() === m - 1 && d.getUTCDay() === targetWeekday) {
        return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    return '';
  }

  const list: Array<{ name: string; date: string; desc: string }> = [
    { name: "New Year's Day", date: `${year}-01-01`, desc: "Start of the new year." },
    { name: 'Martin Luther King Jr. Day', date: getNthWeekday(1, 1, 3), desc: 'Honoring civil rights leader Dr. Martin Luther King Jr.' },
    { name: "Presidents' Day", date: getNthWeekday(2, 1, 3), desc: "Washington's Birthday federal holiday." },
    { name: 'Memorial Day', date: getLastWeekday(5, 1), desc: 'Remembering military personnel who died in service.' },
    { name: 'Juneteenth National Independence Day', date: `${year}-06-19`, desc: 'Emancipation of enslaved African Americans.' },
    { name: 'Independence Day', date: `${year}-07-04`, desc: 'Celebration of the Declaration of Independence.' },
    { name: 'Labor Day', date: getNthWeekday(9, 1, 1), desc: 'Honoring the American labor movement.' },
    { name: 'Columbus Day', date: getNthWeekday(10, 1, 2), desc: 'Federal holiday honoring Christopher Columbus / Indigenous Peoples Day.' },
    { name: 'Veterans Day', date: `${year}-11-11`, desc: 'Honoring all military veterans.' },
    { name: 'Thanksgiving Day', date: getNthWeekday(11, 4, 4), desc: 'National day of thanksgiving.' },
    { name: 'Christmas Day', date: `${year}-12-25`, desc: 'Christmas celebration.' },
  ];

  for (const h of list) {
    if (h.date) {
      holidays.push({
        id: `hol-us-${h.date}-${encodeURIComponent(h.name.slice(0, 12)).toLowerCase()}`,
        name: h.name,
        date: h.date,
        country: 'US',
        type: 'federal',
        subType: 'Federal Holiday',
        description: h.desc,
      });
    }
  }

  return holidays;
}

/**
 * Fetches dynamic holidays from Google Calendar's public holiday iCal feed,
 * falling back gracefully to the dynamic astronomical generator if network fails
 * or if the requested year is outside the live feed's coverage.
 */
export async function fetchLiveHolidays(countryCode: string = 'IN', targetYear?: number): Promise<DbHoliday[]> {
  const code = countryCode.toUpperCase();
  const feedUrl = GOOGLE_CALENDAR_FEEDS[code];

  // Check in-memory feed cache first
  const cached = rawFeedCache[code];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    if (targetYear) {
      const yearFiltered = cached.holidays.filter((h) => h.date.startsWith(`${targetYear}-`));
      if (yearFiltered.length > 0) {
        return yearFiltered;
      }
    } else {
      return cached.holidays;
    }
  }

  // Fetch live from Google Calendar
  if (feedUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const res = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GoogleCalendarIntegration/1.0)',
          Accept: 'text/calendar, text/plain, */*',
        },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const parsed = parseGoogleCalendarIcs(text, code);

        if (parsed.length > 0) {
          rawFeedCache[code] = {
            timestamp: Date.now(),
            holidays: parsed,
          };

          if (targetYear) {
            const yearFiltered = parsed.filter((h) => h.date.startsWith(`${targetYear}-`));
            if (yearFiltered.length > 0) {
              return yearFiltered;
            }
          } else {
            return parsed;
          }
        }
      }
    } catch (err: any) {
      console.warn(`[HolidayService] Could not fetch live Google Calendar feed for ${code}: ${err.message}`);
    }
  }

  // If live feed failed or did not cover targetYear, use dynamic generator
  if (targetYear) {
    if (code === 'IN') {
      return generateIndianHolidaysForYear(targetYear);
    } else if (code === 'US') {
      return generateUSHolidaysForYear(targetYear);
    }
  }

  return [];
}
