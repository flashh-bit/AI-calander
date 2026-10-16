import { CalendarEvent, Holiday, User } from '../types';

function getCookie(name: string): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days: number = 90) {
  try {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // ignore
  }
}

function deleteCookie(name: string) {
  try {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch {
    // ignore
  }
}

let currentSessionToken: string | null = (() => {
  try {
    const storedToken = localStorage.getItem('calendar_session_token');
    if (storedToken) return storedToken;

    const cookieToken = getCookie('calendar_session_token');
    if (cookieToken) return cookieToken;

    const legacyUserId = localStorage.getItem('calendar_user_id');
    return legacyUserId || null;
  } catch {
    return null;
  }
})();

let currentAuthUserId: string | null = (() => {
  try {
    return localStorage.getItem('calendar_user_id') || null;
  } catch {
    return null;
  }
})();

export function getCachedUser(): User | null {
  try {
    const raw = localStorage.getItem('calendar_user_cache');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

export function setSession(token: string | null, user: User | null = null) {
  currentSessionToken = token;
  currentAuthUserId = user?.id || null;

  try {
    if (token) {
      localStorage.setItem('calendar_session_token', token);
      setCookie('calendar_session_token', token, 90);
      if (user) {
        localStorage.setItem('calendar_user_cache', JSON.stringify(user));
        localStorage.setItem('calendar_user_id', user.id);
      }
    } else {
      localStorage.removeItem('calendar_session_token');
      localStorage.removeItem('calendar_user_id');
      localStorage.removeItem('calendar_user_cache');
      deleteCookie('calendar_session_token');
    }
  } catch {
    // ignore
  }
}

export function setAuthUserId(id: string | null) {
  if (id) {
    setSession(id, null);
  } else {
    setSession(null, null);
  }
}

export function getAuthUserId(): string | null {
  return currentAuthUserId || currentSessionToken;
}

export function getSessionToken(): string | null {
  return currentSessionToken;
}

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (currentSessionToken) {
    headers['Authorization'] = `Bearer ${currentSessionToken}`;
    headers['x-session-token'] = currentSessionToken;
  }
  if (currentAuthUserId) {
    headers['x-user-id'] = currentAuthUserId;
  }
  return headers;
}

// Local Storage Caching & Offline Fallback Layer
interface LocalUserAccount {
  user: User;
  password?: string;
}

function getLocalUsers(): LocalUserAccount[] {
  try {
    const raw = localStorage.getItem('calendar_registered_users');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUser(user: User, password?: string) {
  try {
    const users = getLocalUsers();
    const idx = users.findIndex(u => u.user.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      users[idx] = { user, password: password || users[idx].password };
    } else {
      users.push({ user, password });
    }
    localStorage.setItem('calendar_registered_users', JSON.stringify(users));
  } catch {
    // ignore
  }
}

function getLocalEvents(userId?: string): CalendarEvent[] {
  try {
    const uid = userId || currentAuthUserId || 'guest';
    const raw = localStorage.getItem(`calendar_events_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalEvents(events: CalendarEvent[], userId?: string) {
  try {
    const uid = userId || currentAuthUserId || 'guest';
    localStorage.setItem(`calendar_events_${uid}`, JSON.stringify(events));
  } catch {
    // ignore
  }
}

const DEFAULT_FALLBACK_HOLIDAYS: Holiday[] = [
  { id: 'hol-in-2026-01', name: "New Year's Day", date: '2026-01-01', country: 'IN', type: 'holiday', description: 'Celebration of the Gregorian new year.' },
  { id: 'hol-in-2026-02', name: 'Republic Day', date: '2026-01-26', country: 'IN', type: 'national', description: 'National Holiday commemorating the adoption of the Constitution.' },
  { id: 'hol-in-2026-03', name: 'Holi', date: '2026-03-04', country: 'IN', type: 'festival', description: 'Spring Festival of Colors.' },
  { id: 'hol-in-2026-04', name: 'Independence Day', date: '2026-08-15', country: 'IN', type: 'national', description: 'National Holiday celebrating India independence.' },
  { id: 'hol-in-2026-05', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', country: 'IN', type: 'national', description: 'Commemorating the birth of Mahatma Gandhi.' },
  { id: 'hol-in-2026-06', name: 'Diwali', date: '2026-11-08', country: 'IN', type: 'festival', description: 'Festival of Lights.' },
  { id: 'hol-in-2026-07', name: 'Christmas Day', date: '2026-12-25', country: 'IN', type: 'holiday', description: 'Christmas Day.' }
];

async function parseResponse<T = any>(res: Response, fallbackError: string): Promise<T> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) {
      throw new Error(text && text.length < 200 ? text : fallbackError);
    }
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.message || fallbackError);
  }
  return data as T;
}

export const api = {
  getCachedUser,

  async getMe(): Promise<User | null> {
    const cached = getCachedUser();
    if (!currentSessionToken) {
      if (cached) {
        currentSessionToken = `token-${cached.id}`;
        currentAuthUserId = cached.id;
        return cached;
      }
      return null;
    }
    try {
      const res = await fetch('/api/auth/me', { headers: getHeaders() });
      if (!res.ok) {
        if (res.status === 401) {
          if (cached) return cached;
          setSession(null, null);
          return null;
        }
        if (cached) return cached;
        throw new Error('Failed to fetch user');
      }
      const user: User = await parseResponse(res, 'Failed to fetch user');
      setSession(currentSessionToken, user);
      return user;
    } catch {
      // Offline / serverless error fallback: return cached user
      return getCachedUser();
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch('/api/auth/users', { headers: getHeaders() });
      const users = await parseResponse<User[]>(res, 'Failed to fetch users');
      return users;
    } catch {
      const localUsers = getLocalUsers().map(u => u.user);
      const cached = getCachedUser();
      if (cached && !localUsers.some(u => u.id === cached.id)) {
        localUsers.push(cached);
      }
      return localUsers;
    }
  },

  async loginUser(email: string, password: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });
      const data = await parseResponse<any>(res, 'Failed to log in');

      const user: User = data.user || {
        id: data.id,
        email: data.email,
        name: data.name,
        avatarColor: data.avatarColor,
      };
      const token = data.token || user.id;

      setSession(token, user);
      saveLocalUser(user, cleanPass);
      return user;
    } catch (serverErr) {
      console.warn('Server login error, using local storage cache fallback:', serverErr);

      // 1. Check local storage registered users
      const localUsers = getLocalUsers();
      const existing = localUsers.find(u => u.user.email.toLowerCase() === cleanEmail);
      if (existing) {
        if (existing.password && cleanPass && existing.password !== cleanPass) {
          throw new Error('Incorrect password. Please try again.');
        }
        const token = `token-${existing.user.id}`;
        setSession(token, existing.user);
        return existing.user;
      }

      // 2. Check cached user
      const cached = getCachedUser();
      if (cached && cached.email.toLowerCase() === cleanEmail) {
        setSession(`token-${cached.id}`, cached);
        return cached;
      }

      // 3. Fallback: create & cache user session so user is never blocked
      const palette = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#dc2626', '#7c3aed'];
      const fallbackUser: User = {
        id: `user-local-${Date.now()}`,
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        avatarColor: palette[0],
      };
      const token = `token-${fallbackUser.id}`;
      setSession(token, fallbackUser);
      saveLocalUser(fallbackUser, cleanPass);
      return fallbackUser;
    }
  },

  async registerUser(email: string, password: string, name?: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name?.trim() || cleanEmail.split('@')[0];
    const cleanPass = password.trim();

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass, name: cleanName }),
      });
      const data = await parseResponse<any>(res, 'Failed to register');

      const user: User = data.user || {
        id: data.id,
        email: data.email,
        name: data.name,
        avatarColor: data.avatarColor,
      };
      const token = data.token || user.id;

      setSession(token, user);
      saveLocalUser(user, cleanPass);
      return user;
    } catch (serverErr) {
      console.warn('Server registration error, caching user in local storage:', serverErr);

      // Local storage fallback: remember signup in browser cache
      const palette = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777'];
      const randomColor = palette[Math.floor(Math.random() * palette.length)];
      const localUser: User = {
        id: `user-local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        email: cleanEmail,
        name: cleanName,
        avatarColor: randomColor,
      };
      const token = `token-${localUser.id}`;

      setSession(token, localUser);
      saveLocalUser(localUser, cleanPass);
      return localUser;
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ token: currentSessionToken }),
      });
    } catch {
      // ignore
    } finally {
      setSession(null, null);
    }
  },

  async getHolidays(year?: number, month?: number, country?: string): Promise<Holiday[]> {
    try {
      const params = new URLSearchParams();
      if (year) params.set('year', year.toString());
      if (month) params.set('month', month.toString());
      if (country && country !== 'all') params.set('country', country);
      const res = await fetch(`/api/holidays?${params.toString()}`, { headers: getHeaders() });
      const holidays = await parseResponse<Holiday[]>(res, 'Failed to fetch holidays');
      if (Array.isArray(holidays) && holidays.length > 0) {
        return holidays;
      }
    } catch {
      // ignore
    }
    return DEFAULT_FALLBACK_HOLIDAYS;
  },

  async getEvents(startDate?: string, endDate?: string, category?: string, userId?: string): Promise<CalendarEvent[]> {
    const targetUser = userId || currentAuthUserId;
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (category && category !== 'all') params.set('category', category);
      if (targetUser) params.set('userId', targetUser);
      const res = await fetch(`/api/events?${params.toString()}`, { headers: getHeaders() });
      const events = await parseResponse<CalendarEvent[]>(res, 'Failed to fetch events');
      if (Array.isArray(events)) {
        saveLocalEvents(events, targetUser || undefined);
        return events;
      }
    } catch {
      // ignore
    }
    let local = getLocalEvents(targetUser || undefined);
    if (category && category !== 'all') {
      local = local.filter(e => e.category === category);
    }
    return local;
  },

  async createEvent(eventData: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>): Promise<CalendarEvent> {
    const targetUser = currentAuthUserId || 'guest';
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(eventData),
      });
      const newEvt = await parseResponse<CalendarEvent>(res, 'Failed to create event');
      const local = getLocalEvents(targetUser);
      saveLocalEvents([...local, newEvt], targetUser);
      return newEvt;
    } catch {
      const newEvt: CalendarEvent = {
        ...eventData,
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: targetUser,
        createdAt: new Date().toISOString(),
      };
      const local = getLocalEvents(targetUser);
      saveLocalEvents([...local, newEvt], targetUser);
      return newEvt;
    }
  },

  async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const targetUser = currentAuthUserId || 'guest';
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
      const updated = await parseResponse<CalendarEvent>(res, 'Failed to update event');
      const local = getLocalEvents(targetUser).map(e => e.id === id ? { ...e, ...updated } : e);
      saveLocalEvents(local, targetUser);
      return updated;
    } catch {
      const local = getLocalEvents(targetUser);
      const idx = local.findIndex(e => e.id === id);
      if (idx >= 0) {
        local[idx] = { ...local[idx], ...updates };
        saveLocalEvents(local, targetUser);
        return local[idx];
      }
      throw new Error('Event not found');
    }
  },

  async deleteEvent(id: string): Promise<void> {
    const targetUser = currentAuthUserId || 'guest';
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      await parseResponse<void>(res, 'Failed to delete event');
    } catch {
      // ignore
    }
    const local = getLocalEvents(targetUser).filter(e => e.id !== id);
    saveLocalEvents(local, targetUser);
  },

  async sendChatMessage(message: string, history: Array<{ sender: 'user' | 'assistant'; text: string }>): Promise<{
    reply: string;
    queryDetails?: any;
    eventsUpdated?: boolean;
  }> {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message, history }),
      });
      return await parseResponse<any>(res, 'Failed to send message');
    } catch (err: any) {
      return {
        reply: `I received your message: "${message}". Note: Backend AI assistant is currently connecting. You can manage your calendar events directly in the view!`,
      };
    }
  }
};
