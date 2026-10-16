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
    if (!currentSessionToken) return null;
    try {
      const res = await fetch('/api/auth/me', { headers: getHeaders() });
      if (!res.ok) {
        if (res.status === 401) {
          // Explicitly unauthenticated or expired token
          setSession(null, null);
          return null;
        }
        // If server is temporarily booting or returned 5xx, use cached user if available
        const cached = getCachedUser();
        if (cached) return cached;
        throw new Error('Failed to fetch user');
      }
      const user: User = await parseResponse(res, 'Failed to fetch user');
      setSession(currentSessionToken, user);
      return user;
    } catch {
      // In case of network glitch, keep cached session if available
      return getCachedUser();
    }
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/auth/users', { headers: getHeaders() });
    return parseResponse<User[]>(res, 'Failed to fetch users');
  },

  async loginUser(email: string, password: string): Promise<User> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: password.trim() }),
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
    return user;
  },

  async registerUser(email: string, password: string, name?: string): Promise<User> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: password.trim(), name: name?.trim() }),
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
    return user;
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
    const params = new URLSearchParams();
    if (year) params.set('year', year.toString());
    if (month) params.set('month', month.toString());
    if (country && country !== 'all') params.set('country', country);
    const res = await fetch(`/api/holidays?${params.toString()}`, { headers: getHeaders() });
    return parseResponse<Holiday[]>(res, 'Failed to fetch holidays');
  },

  async getEvents(startDate?: string, endDate?: string, category?: string, userId?: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (category && category !== 'all') params.set('category', category);
    const targetUser = userId || currentAuthUserId;
    if (targetUser) params.set('userId', targetUser);
    const res = await fetch(`/api/events?${params.toString()}`, { headers: getHeaders() });
    return parseResponse<CalendarEvent[]>(res, 'Failed to fetch events');
  },

  async createEvent(eventData: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>): Promise<CalendarEvent> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(eventData),
    });
    return parseResponse<CalendarEvent>(res, 'Failed to create event');
  },

  async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    return parseResponse<CalendarEvent>(res, 'Failed to update event');
  },

  async deleteEvent(id: string): Promise<void> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return parseResponse<void>(res, 'Failed to delete event');
  },

  async sendChatMessage(message: string, history: Array<{ sender: 'user' | 'assistant'; text: string }>): Promise<{
    reply: string;
    queryDetails?: any;
    eventsUpdated?: boolean;
  }> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, history }),
    });
    return parseResponse<any>(res, 'Failed to send message');
  }
};
