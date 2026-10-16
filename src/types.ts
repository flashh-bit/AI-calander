export type EventCategory = 'work' | 'personal' | 'meeting' | 'health' | 'reminder';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  allDay: boolean;
  category: EventCategory;
  location?: string;
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  country: string;
  type: 'holiday' | 'national' | 'festival' | 'gazetted' | 'federal' | 'public' | 'observance';
  description?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
}

export interface AuthResponse {
  user?: User;
  token: string;
  expiresAt?: string;
  id: string;
  email: string;
  name: string;
  avatarColor: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  queryDetails?: {
    type: string;
    count?: number;
    dateRange?: string;
    holidayCount?: number;
    eventCount?: number;
    date?: string;
    items?: Array<{ title: string; date: string; time?: string; type: 'event' | 'holiday' }>;
  };
}
