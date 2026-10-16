import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface DbUser {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  avatarColor: string;
  createdAt: string;
}

export interface DbEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  category: 'work' | 'personal' | 'meeting' | 'health' | 'reminder';
  location?: string;
  createdAt: string;
}

export interface DbHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  country: string;
  type: 'holiday' | 'national' | 'festival' | 'gazetted' | 'federal' | 'public' | 'observance';
  subType?: string;
  description?: string;
}

export interface DbSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

interface DatabaseSchema {
  users: DbUser[];
  events: DbEvent[];
  holidays: DbHoliday[];
  sessions: DbSession[];
}

const IS_VERCEL = !!process.env.VERCEL;
const SEED_FILE = path.join(process.cwd(), 'data', 'calendar_db.json');
const DB_DIR = IS_VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const DB_FILE = IS_VERCEL ? path.join('/tmp', 'calendar_db.json') : path.join(DB_DIR, 'calendar_db.json');

export const INITIAL_HOLIDAYS: DbHoliday[] = [
  // 2026 Public, National & Festival Holidays for India
  { id: 'hol-in-2026-01', name: "New Year's Day", date: '2026-01-01', country: 'IN', type: 'holiday', subType: 'Public Holiday', description: 'Celebration of the first day of the Gregorian new year.' },
  { id: 'hol-in-2026-02', name: 'Makar Sankranti / Pongal', date: '2026-01-14', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Harvest festival celebrating the transition of the Sun into Capricorn (Makara).' },
  { id: 'hol-in-2026-03', name: 'Guru Gobind Singh Jayanti', date: '2026-01-20', country: 'IN', type: 'holiday', subType: 'Observance', description: 'Birth anniversary of the tenth Sikh Guru, Guru Gobind Singh Ji.' },
  { id: 'hol-in-2026-04', name: 'Republic Day', date: '2026-01-26', country: 'IN', type: 'holiday', subType: 'National Holiday', description: 'National Holiday commemorating the adoption of the Constitution of India in 1950.' },
  { id: 'hol-in-2026-05', name: 'Maha Shivratri', date: '2026-02-15', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Major Hindu festival solemnizing the convergence of Shiva and Shakti.' },
  { id: 'hol-in-2026-06', name: 'Holi (Festival of Colors)', date: '2026-03-04', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Spring Festival of Colors celebrating love, spring, and the triumph of good over evil.' },
  { id: 'hol-in-2026-07', name: 'Eid-ul-Fitr (Ramzan Eid)', date: '2026-03-21', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Major Islamic festival marking the end of Ramadan, celebrated with prayers and feasts.' },
  { id: 'hol-in-2026-08', name: 'Ram Navami', date: '2026-03-27', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Hindu festival celebrating the birth of Lord Rama.' },
  { id: 'hol-in-2026-09', name: 'Mahavir Jayanti', date: '2026-03-31', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Major religious holiday celebrating the birth of Lord Mahavira.' },
  { id: 'hol-in-2026-10', name: 'Good Friday', date: '2026-04-03', country: 'IN', type: 'holiday', subType: 'Public Holiday', description: 'Christian holiday commemorating the passion and crucifixion of Jesus.' },
  { id: 'hol-in-2026-11', name: 'Easter Sunday', date: '2026-04-05', country: 'IN', type: 'holiday', subType: 'Public Holiday', description: 'Celebration of the resurrection of Jesus Christ.' },
  { id: 'hol-in-2026-12', name: 'Dr. B.R. Ambedkar Jayanti', date: '2026-04-14', country: 'IN', type: 'holiday', subType: 'Gazetted Holiday', description: 'Honoring Dr. B.R. Ambedkar, chief architect of the Indian Constitution.' },
  { id: 'hol-in-2026-13', name: 'Buddha Purnima', date: '2026-05-01', country: 'IN', type: 'holiday', subType: 'Gazetted Holiday', description: 'Commemorating the birth, enlightenment, and death of Gautama Buddha.' },
  { id: 'hol-in-2026-14', name: 'Eid-ul-Adha (Bakrid)', date: '2026-05-27', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Major Islamic festival commemorating Prophet Ibrahim’s devotion.' },
  { id: 'hol-in-2026-15', name: 'Muharram (Ashura)', date: '2026-06-26', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'First month of Islamic year, observing the martyrdom of Imam Hussain.' },
  { id: 'hol-in-2026-16', name: 'Independence Day', date: '2026-08-15', country: 'IN', type: 'holiday', subType: 'National Holiday', description: 'National Holiday celebrating India’s independence from British rule in 1947.' },
  { id: 'hol-in-2026-17', name: 'Milad-un-Nabi (Id-e-Milad)', date: '2026-08-26', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Commemorating the birth anniversary of Prophet Muhammad.' },
  { id: 'hol-in-2026-18', name: 'Raksha Bandhan', date: '2026-08-28', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Festival celebrating the bond of protection and affection between brothers and sisters.' },
  { id: 'hol-in-2026-19', name: 'Krishna Janmashtami', date: '2026-09-04', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Celebration of the birth of Lord Krishna.' },
  { id: 'hol-in-2026-20', name: 'Ganesh Chaturthi', date: '2026-09-14', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Grand Hindu festival celebrating the arrival of Lord Ganesha.' },
  { id: 'hol-in-2026-21', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', country: 'IN', type: 'holiday', subType: 'National Holiday', description: 'National Holiday commemorating the birth of Mahatma Gandhi.' },
  { id: 'hol-in-2026-22', name: 'Maha Navami / Durga Puja', date: '2026-10-19', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Ninth day of Navratri festival celebrating Goddess Durga.' },
  { id: 'hol-in-2026-23', name: 'Dussehra (Vijayadashami)', date: '2026-10-20', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Celebration of Lord Rama’s victory over Ravana, symbolizing good defeating evil.' },
  { id: 'hol-in-2026-24', name: 'Diwali (Deepavali / Lakshmi Puja)', date: '2026-11-08', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Grand Festival of Lights celebrating wealth, joy, and the victory of light over darkness.' },
  { id: 'hol-in-2026-25', name: 'Govardhan Puja', date: '2026-11-09', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Worship of Govardhan Hill and celebration of nature, honoring Lord Krishna.' },
  { id: 'hol-in-2026-26', name: 'Bhai Dooj', date: '2026-11-10', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Traditional celebration of the bond between sisters and brothers.' },
  { id: 'hol-in-2026-27', name: 'Chhath Puja', date: '2026-11-15', country: 'IN', type: 'holiday', subType: 'Festival Holiday', description: 'Sacred festival dedicated to the Sun God Surya and Usha.' },
  { id: 'hol-in-2026-28', name: 'Guru Nanak Jayanti', date: '2026-11-24', country: 'IN', type: 'holiday', subType: 'Gazetted Holiday', description: 'Celebration of the birth of Guru Nanak Dev Ji, founder of Sikhism.' },
  { id: 'hol-in-2026-29', name: 'Christmas Day', date: '2026-12-25', country: 'IN', type: 'holiday', subType: 'Public Holiday', description: 'Celebrating the birth of Jesus Christ.' },

  // US Federal Holidays
  { id: 'hol-2026-01', name: "New Year's Day", date: '2026-01-01', country: 'US', type: 'federal', description: 'Federal holiday celebrating the start of the year.' },
  { id: 'hol-2026-02', name: 'Martin Luther King Jr. Day', date: '2026-01-19', country: 'US', type: 'federal', description: 'Honoring civil rights leader Dr. Martin Luther King Jr.' },
  { id: 'hol-2026-03', name: "Presidents' Day", date: '2026-02-16', country: 'US', type: 'federal', description: "Washington's Birthday federal holiday." },
  { id: 'hol-2026-04', name: 'Memorial Day', date: '2026-05-25', country: 'US', type: 'federal', description: 'Remembering military personnel who died in service.' },
  { id: 'hol-2026-05', name: 'Juneteenth National Independence Day', date: '2026-06-19', country: 'US', type: 'federal', description: 'Commemorating the emancipation of enslaved African Americans.' },
  { id: 'hol-2026-06', name: 'Independence Day', date: '2026-07-04', country: 'US', type: 'federal', description: 'Celebration of the Declaration of Independence.' },
  { id: 'hol-2026-07', name: 'Labor Day', date: '2026-09-07', country: 'US', type: 'federal', description: 'Honoring the American labor movement and workers.' },
  { id: 'hol-2026-08', name: 'Indigenous Peoples / Columbus Day', date: '2026-10-12', country: 'US', type: 'federal', description: 'Federal holiday commemorating Indigenous Peoples.' },
  { id: 'hol-2026-09', name: 'Veterans Day', date: '2026-11-11', country: 'US', type: 'federal', description: 'Honoring all military veterans who served in the Armed Forces.' },
  { id: 'hol-2026-10', name: 'Thanksgiving Day', date: '2026-11-26', country: 'US', type: 'federal', description: 'Annual federal holiday of thanksgiving and feast.' },
  { id: 'hol-2026-11', name: 'Day After Thanksgiving', date: '2026-11-27', country: 'US', type: 'public', description: 'State and public holiday following Thanksgiving.' },
  { id: 'hol-2026-12', name: 'Christmas Day', date: '2026-12-25', country: 'US', type: 'federal', description: 'Federal holiday celebrating Christmas.' },
  { id: 'hol-2026-13', name: "New Year's Eve", date: '2026-12-31', country: 'US', type: 'observance', description: "Observance of the final day of the year." },

  // 2025 Public & Federal Holidays
  { id: 'hol-2025-01', name: "New Year's Day", date: '2025-01-01', country: 'US', type: 'federal' },
  { id: 'hol-2025-02', name: 'Martin Luther King Jr. Day', date: '2025-01-20', country: 'US', type: 'federal' },
  { id: 'hol-2025-03', name: "Presidents' Day", date: '2025-02-17', country: 'US', type: 'federal' },
  { id: 'hol-2025-04', name: 'Memorial Day', date: '2025-05-26', country: 'US', type: 'federal' },
  { id: 'hol-2025-05', name: 'Juneteenth', date: '2025-06-19', country: 'US', type: 'federal' },
  { id: 'hol-2025-06', name: 'Independence Day', date: '2025-07-04', country: 'US', type: 'federal' },
  { id: 'hol-2025-07', name: 'Labor Day', date: '2025-09-01', country: 'US', type: 'federal' },
  { id: 'hol-2025-08', name: 'Columbus / Indigenous Peoples Day', date: '2025-10-13', country: 'US', type: 'federal' },
  { id: 'hol-2025-09', name: 'Veterans Day', date: '2025-11-11', country: 'US', type: 'federal' },
  { id: 'hol-2025-10', name: 'Thanksgiving Day', date: '2025-11-27', country: 'US', type: 'federal' },
  { id: 'hol-2025-11', name: 'Christmas Day', date: '2025-12-25', country: 'US', type: 'federal' },

  // 2027 Public & Federal Holidays
  { id: 'hol-2027-01', name: "New Year's Day", date: '2027-01-01', country: 'US', type: 'federal' },
  { id: 'hol-2027-02', name: 'Martin Luther King Jr. Day', date: '2027-01-18', country: 'US', type: 'federal' },
  { id: 'hol-2027-03', name: "Presidents' Day", date: '2027-02-15', country: 'US', type: 'federal' },
  { id: 'hol-2027-04', name: 'Memorial Day', date: '2027-05-31', country: 'US', type: 'federal' },
  { id: 'hol-2027-05', name: 'Juneteenth', date: '2027-06-19', country: 'US', type: 'federal' },
  { id: 'hol-2027-06', name: 'Independence Day', date: '2027-07-04', country: 'US', type: 'federal' },
  { id: 'hol-2027-07', name: 'Labor Day', date: '2027-09-06', country: 'US', type: 'federal' },
  { id: 'hol-2027-08', name: 'Columbus / Indigenous Peoples Day', date: '2027-10-11', country: 'US', type: 'federal' },
  { id: 'hol-2027-09', name: 'Veterans Day', date: '2027-11-11', country: 'US', type: 'federal' },
  { id: 'hol-2027-10', name: 'Thanksgiving Day', date: '2027-11-25', country: 'US', type: 'federal' },
  { id: 'hol-2027-11', name: 'Christmas Day', date: '2027-12-25', country: 'US', type: 'federal' }
];

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

const DUMMY_USER_IDS = new Set(['user-alex-1', 'user-taylor-2', 'user-krishna-3']);
const DUMMY_EMAILS = new Set(['alex@example.com', 'taylor@example.com', 'theflashkrishna@gmail.com']);

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (IS_VERCEL && !fs.existsSync(DB_FILE) && fs.existsSync(SEED_FILE)) {
        try {
          fs.copyFileSync(SEED_FILE, DB_FILE);
        } catch (e) {
          console.error('Failed to copy seed database to /tmp:', e);
        }
      }
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.events && parsed.holidays) {
          let hasUpdates = false;

          // Strip any dummy or sample preview users
          const cleanUsers = (parsed.users as DbUser[]).filter(
            (u) => !DUMMY_USER_IDS.has(u.id) && !DUMMY_EMAILS.has(u.email?.toLowerCase())
          );
          if (cleanUsers.length !== parsed.users.length) {
            parsed.users = cleanUsers;
            hasUpdates = true;
          }

          // Strip any dummy or sample events
          const cleanEvents = (parsed.events as DbEvent[]).filter(
            (e) => !DUMMY_USER_IDS.has(e.userId) && !e.id.startsWith('evt-alex-') && !e.id.startsWith('evt-taylor-') && !e.id.startsWith('evt-krishna-')
          );
          if (cleanEvents.length !== parsed.events.length) {
            parsed.events = cleanEvents;
            hasUpdates = true;
          }

          // Ensure sessions array is present
          if (!parsed.sessions || !Array.isArray(parsed.sessions)) {
            parsed.sessions = [];
            hasUpdates = true;
          }

          // Merge in any missing shared holidays
          for (const initHol of INITIAL_HOLIDAYS) {
            const exists = parsed.holidays.some((h: DbHoliday) => h.id === initHol.id || (h.name === initHol.name && h.date === initHol.date && h.country === initHol.country));
            if (!exists) {
              parsed.holidays.push(initHol);
              hasUpdates = true;
            }
          }

          if (hasUpdates) {
            this.saveData(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading DB file, creating fresh initial dataset:', e);
    }

    const initial: DatabaseSchema = {
      users: [],
      events: [],
      holidays: INITIAL_HOLIDAYS,
      sessions: []
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  // User management & authentication
  public getUsers(): DbUser[] {
    return this.data.users.map((u) => this.sanitizeUser(u));
  }

  public getUserById(id: string): DbUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): DbUser | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  }

  public sanitizeUser(user: DbUser): DbUser {
    const { passwordHash, ...safeUser } = user;
    return safeUser as DbUser;
  }

  public register(email: string, password: string, name?: string): { success: boolean; user?: DbUser; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }

    const trimmedName = name?.trim();
    if (!trimmedName) {
      return { success: false, error: 'Please enter your name.' };
    }

    const existing = this.getUserByEmail(cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email already exists. Please log in.' };
    }

    const colors = ['indigo', 'emerald', 'amber', 'rose', 'sky', 'violet'];
    const avatarColor = colors[this.data.users.length % colors.length];

    const newUser: DbUser = {
      id: `user-${crypto.randomUUID()}`,
      email: cleanEmail,
      name: trimmedName,
      passwordHash: hashPassword(password),
      avatarColor,
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.saveData(this.data);
    return { success: true, user: this.sanitizeUser(newUser) };
  }

  public authenticate(email: string, password: string): { success: boolean; user?: DbUser; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Email is required.' };
    }
    if (!password) {
      return { success: false, error: 'Password is required.' };
    }

    const user = this.getUserByEmail(cleanEmail);
    if (!user) {
      return { success: false, error: 'No account found with this email. Please sign up.' };
    }

    if (user.passwordHash) {
      const incomingHash = hashPassword(password);
      if (incomingHash !== user.passwordHash) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
    }

    return { success: true, user: this.sanitizeUser(user) };
  }

  // Session persistence across sessions, browser refreshes, and app restarts
  public createSession(userId: string): DbSession {
    if (!this.data.sessions) {
      this.data.sessions = [];
    }
    // Clean up any expired sessions
    const now = Date.now();
    this.data.sessions = this.data.sessions.filter(
      (s) => new Date(s.expiresAt).getTime() > now
    );

    // 90-day persistence so session lasts across browser restarts and reasonable time gaps
    const expiresAt = new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString();
    const token = `sess_${crypto.randomUUID().replace(/-/g, '')}_${Date.now().toString(36)}`;

    const session: DbSession = {
      token,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    this.data.sessions.push(session);
    this.saveData(this.data);
    return session;
  }

  public getSessionUser(token: string): DbUser | null {
    if (!token || !this.data.sessions) return null;
    const session = this.data.sessions.find((s) => s.token === token);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      // Expired: prune
      this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
      this.saveData(this.data);
      return null;
    }

    const user = this.getUserById(session.userId);
    return user ? this.sanitizeUser(user) : null;
  }

  public deleteSession(token: string): boolean {
    if (!this.data.sessions) return false;
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    if (this.data.sessions.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public deleteUserSessions(userId: string): void {
    if (!this.data.sessions) return;
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
    this.saveData(this.data);
  }

  // Dynamic holiday caching per year & country
  public hasHolidaysForYear(year: number, country: string = 'IN'): boolean {
    return this.data.holidays.some((h) => {
      const y = parseInt(h.date.substring(0, 4), 10);
      return y === year && (country === 'all' || h.country.toUpperCase() === country.toUpperCase());
    });
  }

  public addHolidays(newHolidays: DbHoliday[]): void {
    const existing = new Set(this.data.holidays.map((h) => `${h.country}-${h.date}-${h.name.toLowerCase()}`));
    let added = false;
    for (const h of newHolidays) {
      const key = `${h.country}-${h.date}-${h.name.toLowerCase()}`;
      if (!existing.has(key)) {
        existing.add(key);
        this.data.holidays.push(h);
        added = true;
      }
    }
    if (added) {
      this.saveData(this.data);
    }
  }

  // Holiday querying
  public getHolidays(filter?: { startDate?: string; endDate?: string; year?: number; month?: number; country?: string }): DbHoliday[] {
    return this.data.holidays.filter(h => {
      if (filter?.country && filter.country !== 'all') {
        if (h.country.toUpperCase() !== filter.country.toUpperCase()) {
          return false;
        }
      }
      if (filter?.year) {
        const hYear = parseInt(h.date.substring(0, 4), 10);
        if (hYear !== filter.year) return false;
      }
      if (filter?.month) {
        const hMonth = parseInt(h.date.substring(5, 7), 10);
        if (hMonth !== filter.month) return false;
      }
      if (filter?.startDate && h.date < filter.startDate) {
        return false;
      }
      if (filter?.endDate && h.date > filter.endDate) {
        return false;
      }
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  // Event querying
  public getEvents(userId: string, filter?: { startDate?: string; endDate?: string; date?: string; category?: string }): DbEvent[] {
    if (!userId) return [];
    return this.data.events.filter(e => {
      if (e.userId !== userId) return false;
      if (filter?.date && e.date !== filter.date) return false;
      if (filter?.startDate && e.date < filter.startDate) return false;
      if (filter?.endDate && e.date > filter.endDate) return false;
      if (filter?.category && e.category !== filter.category) return false;
      return true;
    }).sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });
  }

  public getEventById(id: string, userId: string): DbEvent | undefined {
    return this.data.events.find(e => e.id === id && e.userId === userId);
  }

  public createEvent(data: Omit<DbEvent, 'id' | 'createdAt'>): DbEvent {
    const newEvent: DbEvent = {
      ...data,
      id: `evt-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString()
    };
    this.data.events.push(newEvent);
    this.saveData(this.data);
    return newEvent;
  }

  public updateEvent(id: string, userId: string, updates: Partial<Omit<DbEvent, 'id' | 'userId' | 'createdAt'>>): DbEvent | null {
    const idx = this.data.events.findIndex(e => e.id === id && e.userId === userId);
    if (idx === -1) return null;

    this.data.events[idx] = {
      ...this.data.events[idx],
      ...updates
    };
    this.saveData(this.data);
    return this.data.events[idx];
  }

  public deleteEvent(id: string, userId: string): boolean {
    const initialLen = this.data.events.length;
    this.data.events = this.data.events.filter(e => !(e.id === id && e.userId === userId));
    const deleted = this.data.events.length < initialLen;
    if (deleted) {
      this.saveData(this.data);
    }
    return deleted;
  }
}

export const db = new Database();
