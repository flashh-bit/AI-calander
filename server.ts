import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { db, DbUser } from './server/db';
import { queryLayer } from './server/queryLayer';
import { processChatWithAI } from './server/groq';
import { fetchLiveHolidays } from './server/holidayService';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to extract cookies from request header
function parseCookie(req: express.Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

// Helper to authenticate request
function getAuthUser(req: express.Request): DbUser | null {
  const authHeader = req.headers.authorization;
  const sessionTokenHeader = req.headers['x-session-token'] as string;
  const headerUserId = (req.headers['x-user-id'] || req.headers['user-id']) as string;
  const cookieToken = parseCookie(req, 'calendar_session_token');
  const queryUserId = (req.query.userId || req.query.user_id) as string;
  const queryEmail = (req.query.email || req.query.userEmail) as string;
  const bodyUserId = (req.body && (req.body.userId || req.body.user_id)) as string;
  const bodyEmail = (req.body && (req.body.email || req.body.userEmail)) as string;

  let candidate = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    candidate = authHeader.substring(7).trim();
  } else if (sessionTokenHeader) {
    candidate = sessionTokenHeader.trim();
  } else if (cookieToken) {
    candidate = cookieToken.trim();
  } else if (headerUserId) {
    candidate = headerUserId.trim();
  } else if (queryUserId) {
    candidate = queryUserId.trim();
  } else if (bodyUserId) {
    candidate = bodyUserId.trim();
  }

  // 1. Check if candidate is an active persistent session token
  if (candidate) {
    const sessionUser = db.getSessionUser(candidate);
    if (sessionUser) return sessionUser;

    // 2. Check if candidate is a user ID
    const userById = db.getUserById(candidate);
    if (userById) return userById;

    // 3. Check if candidate is an email
    const userByEmail = db.getUserByEmail(candidate);
    if (userByEmail) return userByEmail;
  }

  const candidateEmail = queryEmail || bodyEmail;
  if (candidateEmail) {
    const userByEmail = db.getUserByEmail(candidateEmail);
    if (userByEmail) return userByEmail;
  }

  return null;
}

// ================= API ROUTES =================

// URL normalization for serverless / Vercel rewrites
app.use((req, res, next) => {
  const origPath = (req.headers['x-matched-path'] as string) || (req.headers['x-forwarded-uri'] as string);
  if (origPath && origPath.startsWith('/api/')) {
    req.url = origPath;
  } else if (req.url && !req.url.startsWith('/api') && (
    req.url.startsWith('/auth') ||
    req.url.startsWith('/events') ||
    req.url.startsWith('/holidays') ||
    req.url.startsWith('/health') ||
    req.url.startsWith('/query') ||
    req.url.startsWith('/chat')
  )) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    currentDate: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
  });
});

// Auth endpoints
app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated', user: null });
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarColor: user.avatarColor,
  });
});

app.get('/api/auth/users', (req, res) => {
  const users = db.getUsers().map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    avatarColor: u.avatarColor,
  }));
  res.json(users);
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const result = db.authenticate(email, password);
  if (!result.success || !result.user) {
    return res.status(401).json({ error: result.error || 'Authentication failed.' });
  }

  const session = db.createSession(result.user.id);
  res.setHeader(
    'Set-Cookie',
    `calendar_session_token=${session.token}; Path=/; Max-Age=7776000; SameSite=Lax`
  );

  res.json({
    user: result.user,
    token: session.token,
    expiresAt: session.expiresAt,
    // Top-level fields for backwards compatibility
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    avatarColor: result.user.avatarColor,
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const result = db.register(email, password, name);
  if (!result.success || !result.user) {
    return res.status(400).json({ error: result.error || 'Registration failed.' });
  }

  const session = db.createSession(result.user.id);
  res.setHeader(
    'Set-Cookie',
    `calendar_session_token=${session.token}; Path=/; Max-Age=7776000; SameSite=Lax`
  );

  res.status(201).json({
    user: result.user,
    token: session.token,
    expiresAt: session.expiresAt,
    // Top-level fields for backwards compatibility
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    avatarColor: result.user.avatarColor,
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const sessionTokenHeader = req.headers['x-session-token'] as string;
  const cookieToken = parseCookie(req, 'calendar_session_token');
  const bodyToken = (req.body && req.body.token) as string;

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (sessionTokenHeader) {
    token = sessionTokenHeader.trim();
  } else if (cookieToken) {
    token = cookieToken.trim();
  } else if (bodyToken) {
    token = bodyToken.trim();
  }

  if (token) {
    db.deleteSession(token);
  }

  res.setHeader(
    'Set-Cookie',
    'calendar_session_token=; Path=/; Max-Age=0; SameSite=Lax'
  );
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Holidays (Shared globally, dynamically fetched and cached per year)
app.get('/api/holidays', async (req, res) => {
  const { year, month, startDate, endDate, country } = req.query;
  const countryCode = (typeof country === 'string' && country !== 'all') ? country.toUpperCase() : 'IN';
  
  let targetYear = year ? parseInt(year as string, 10) : undefined;
  if (!targetYear && startDate && typeof startDate === 'string') {
    targetYear = parseInt(startDate.substring(0, 4), 10);
  }
  if (!targetYear) {
    targetYear = new Date().getFullYear();
  }

  // Check if holidays for targetYear are already cached in DB
  if (targetYear && !db.hasHolidaysForYear(targetYear, countryCode)) {
    try {
      const fetched = await fetchLiveHolidays(countryCode, targetYear);
      if (fetched && fetched.length > 0) {
        db.addHolidays(fetched);
      }
    } catch (e) {
      console.error(`Failed to fetch live holidays for ${countryCode} ${targetYear}:`, e);
      // Gracefully continue with whatever exists in DB or fallback
    }
  }

  const holidays = db.getHolidays({
    year: year ? parseInt(year as string, 10) : undefined,
    month: month ? parseInt(month as string, 10) : undefined,
    startDate: startDate as string,
    endDate: endDate as string,
    country: country as string,
  });
  res.json(holidays);
});

// Events (User-specific)
app.get('/api/events', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.json([]);
  }
  const { date, startDate, endDate, category } = req.query;
  const events = db.getEvents(user.id, {
    date: date as string,
    startDate: startDate as string,
    endDate: endDate as string,
    category: category as string,
  });
  res.json(events);
});

app.get('/api/events/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please log in to view events' });
  }
  const event = db.getEventById(req.params.id, user.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found or does not belong to user' });
  }
  res.json(event);
});

app.post('/api/events', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please log in to create events' });
  }
  const { title, date, startTime, endTime, allDay, category, location, description } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required' });
  }

  const newEvent = db.createEvent({
    userId: user.id,
    title: title.trim(),
    date,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    allDay: allDay ?? (!startTime),
    category: category || 'personal',
    location: location?.trim() || undefined,
    description: description?.trim() || undefined,
  });

  res.status(201).json(newEvent);
});

app.put('/api/events/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please log in to update events' });
  }
  const eventId = req.params.id;
  const { title, date, startTime, endTime, allDay, category, location, description } = req.body;

  const updated = db.updateEvent(eventId, user.id, {
    title: title !== undefined ? title.trim() : undefined,
    date,
    startTime,
    endTime,
    allDay,
    category,
    location,
    description,
  });

  if (!updated) {
    return res.status(404).json({ error: 'Event not found' });
  }

  res.json(updated);
});

app.delete('/api/events/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please log in to delete events' });
  }
  const eventId = req.params.id;
  const success = db.deleteEvent(eventId, user.id);
  if (!success) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json({ success: true, message: 'Event deleted' });
});

// Query Layer endpoint (used by UI stats or custom lookups)
app.get('/api/query/summary', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.json({
      month: 9,
      year: 2026,
      totalEvents: 0,
      totalHolidays: 0,
      busiestDay: null,
      categoryCounts: {},
      conflicts: [],
    });
  }
  const month = req.query.month ? parseInt(req.query.month as string, 10) : 9;
  const year = req.query.year ? parseInt(req.query.year as string, 10) : 2026;
  const summary = queryLayer.getMonthSummary(user.id, month, year);
  res.json(summary);
});

// Chat Assistant endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        reply: 'Please sign in or create an account to view and manage your schedule with the AI assistant.',
      });
    }
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message string is required' });
    }

    const result = await processChatWithAI(user, message.trim(), history || []);
    res.json(result);
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      reply: 'An error occurred while computing the calendar answer. Please try again.',
      error: String(error),
    });
  }
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

// ================= VITE / STATIC SERVING =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Calendar server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
