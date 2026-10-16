import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { CalendarGrid } from './components/CalendarGrid';
import { EventModal } from './components/EventModal';
import { DayDetailsModal } from './components/DayDetailsModal';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { MobileFilterSheet } from './components/MobileFilterSheet';
import { ChatWidget } from './components/ChatWidget';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { CalendarEvent, Holiday, User, EventCategory } from './types';
import { api, setAuthUserId } from './lib/api';
import { buildMonthGrid, TODAY_ISO } from './lib/dateUtils';

export default function App() {
  const initialDate = new Date();
  // Current calendar view (defaults to real current year & month)
  const [currentYear, setCurrentYear] = useState(() => initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => initialDate.getMonth() + 1); // 1-12

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Country filter for holidays (defaults to 'IN' for India)
  const [selectedCountry, setSelectedCountry] = useState<string>('IN');

  // Auth / Users - initialized with cached user if session token exists
  const [currentUser, setCurrentUser] = useState<User | null>(() => api.getCachedUser());
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  // Data
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  // Splash screen minimum display timer
  const [isMinSplashDurationElapsed, setIsMinSplashDurationElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinSplashDurationElapsed(true);
    }, 1300);
    return () => clearTimeout(timer);
  }, []);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventDefaultDate, setEventDefaultDate] = useState<string>(() => TODAY_ISO);

  const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string>(() => TODAY_ISO);

  const [isMobileFilterSheetOpen, setIsMobileFilterSheetOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial user loading
  useEffect(() => {
    async function initAuth() {
      try {
        const [me, users] = await Promise.all([
          api.getMe(),
          api.getUsers().catch(() => []),
        ]);
        setCurrentUser(me);
        if (users && users.length > 0) {
          setAllUsers(users);
        }
      } catch (err) {
        console.error('Failed to init auth:', err);
      } finally {
        setIsAuthLoaded(true);
      }
    }
    initAuth();
  }, []);

  // Fetch events & holidays when month, year, or user changes
  const loadCalendarData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Determine date boundary for the calendar view (including prev & next month margins)
      const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
      const nextM = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextY = currentMonth === 12 ? currentYear + 1 : currentYear;

      const startDate = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
      const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-28`;

      if (currentUser?.id) {
        const [evts, hols] = await Promise.all([
          api.getEvents(startDate, endDate, undefined, currentUser.id),
          api.getHolidays(currentYear, undefined, selectedCountry),
        ]);
        setEvents(evts);
        setHolidays(hols);
      } else {
        const hols = await api.getHolidays(currentYear, undefined, selectedCountry);
        setEvents([]);
        setHolidays(hols);
      }
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setIsLoading(false);
      setIsInitialDataLoaded(true);
    }
  }, [currentYear, currentMonth, currentUser?.id, selectedCountry]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // Jump to specific date (e.g. from chat assistant)
  const handleJumpToDate = (dateStr: string) => {
    try {
      const [y, m] = dateStr.split('-').map(Number);
      if (y && m) {
        setCurrentYear(y);
        setCurrentMonth(m);
        setSelectedDayDate(dateStr);
        setIsDayDetailsOpen(true);
      }
    } catch (e) {
      console.error('Invalid date jump:', e);
    }
  };

  // User auth actions
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthUserId(user.id);
    setAllUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      return exists ? prev : [...prev, user];
    });
    setEvents([]);
    showToast(`Welcome, ${user.name || user.email}!`);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setAuthUserId(null);
    setCurrentUser(null);
    setEvents([]);
    setIsUserSwitcherOpen(false);
    showToast('You have been logged out.');
  };

  const handleLoginAnother = async (email: string, password: string) => {
    const user = await api.loginUser(email, password);
    setCurrentUser(user);
    setAuthUserId(user.id);
    setAllUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      return exists ? prev : [...prev, user];
    });
    setEvents([]);
    showToast(`Signed in as ${user.name || user.email}`);
  };

  const handleSelectUser = async (user: User) => {
    setAuthUserId(user.id);
    setCurrentUser(user);
    setEvents([]);
    showToast(`Switched account to ${user.name}`);
  };

  // Event modal actions
  const handleOpenNewEvent = (date?: string) => {
    setEditingEvent(null);
    setEventDefaultDate(date || `${currentYear}-${String(currentMonth).padStart(2, '0')}-15`);
    setIsEventModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      if (editingEvent) {
        const updated = await api.updateEvent(editingEvent.id, eventData);
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        showToast(`Event updated: "${updated.title}"`);
      } else {
        const created = await api.createEvent(
          eventData as Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>
        );
        setEvents((prev) => [...prev, created]);
        showToast(`Event created: "${created.title}"`);
      }
      setIsEventModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save event');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await api.deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      showToast('Event removed from your calendar');
      setIsEventModalOpen(false);
      setIsDayDetailsOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete event');
    }
  };

  // Day click action
  const handleSelectDate = (date: string) => {
    setSelectedDayDate(date);
    setIsDayDetailsOpen(true);
  };

  // User-isolated events: ensure only events belonging to currentUser are accessible
  const userEvents = useMemo(() => {
    if (!currentUser) return events;
    return events.filter((e) => !e.userId || e.userId === currentUser.id);
  }, [events, currentUser]);

  // Filtered events by category
  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'all') return userEvents;
    return userEvents.filter((e) => e.category === selectedCategory);
  }, [userEvents, selectedCategory]);

  // Counts by category for the logged-in user
  const eventCountsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of userEvents) {
      counts[e.category] = (counts[e.category] || 0) + 1;
    }
    return counts;
  }, [userEvents]);

  // Computed public holidays for current viewed month (shared globally for all users)
  const holidaysThisMonth = useMemo(() => {
    const mStr = String(currentMonth).padStart(2, '0');
    const prefix = `${currentYear}-${mStr}`;
    return holidays.filter((h) => h.date.startsWith(prefix));
  }, [holidays, currentYear, currentMonth]);

  // Selected day items for DayDetailsModal (strictly logged-in user events + shared holidays)
  const selectedDayEvents = useMemo(() => {
    return userEvents.filter((e) => e.date === selectedDayDate);
  }, [userEvents, selectedDayDate]);

  const selectedDayHolidays = useMemo(() => {
    return holidays.filter((h) => h.date === selectedDayDate);
  }, [holidays, selectedDayDate]);

  // Build grid matrix
  const cells = useMemo(() => {
    return buildMonthGrid(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const isAppReady = isAuthLoaded && (isInitialDataLoaded || !currentUser);
  const showSplash = !isAppReady || !isMinSplashDurationElapsed;

  if (isAuthLoaded && !currentUser && isMinSplashDurationElapsed) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] text-[#2d3139] flex flex-col font-sans">
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 bg-[#2d3139] text-[#f7f6f2] text-xs font-medium px-4 py-2.5 rounded-xl shadow-md border border-[#444c56] animate-in fade-in slide-in-from-top-2">
            {toastMessage}
          </div>
        )}
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#2d3139] flex flex-col font-sans selection:bg-[#cbd5e1] selection:text-[#1e293b]">
      {/* Initial App Splash Screen with smooth fade-out */}
      <AnimatePresence>
        {showSplash && <SplashScreen isLoading={!isAppReady} />}
      </AnimatePresence>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#2d3139] text-[#f7f6f2] text-xs font-medium px-4 py-2.5 rounded-xl shadow-md border border-[#444c56] animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Main Header */}
      <Header
        currentYear={currentYear}
        currentMonth={currentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        onOpenNewEvent={() => handleOpenNewEvent()}
        onOpenUserSwitcher={() => setIsUserSwitcherOpen(true)}
        onLogout={handleLogout}
        currentUser={currentUser}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedCountry={selectedCountry}
        onSelectCountry={setSelectedCountry}
        eventCountsByCategory={eventCountsByCategory}
        totalEventsCount={userEvents.length}
        holidaysThisMonthCount={holidaysThisMonth.length}
      />

      {/* Calendar Grid Body */}
      <main className="flex-1 overflow-x-hidden">
        <CalendarGrid
          cells={cells}
          events={filteredEvents}
          holidays={holidays}
          onSelectDate={handleSelectDate}
          onSelectEvent={handleSelectEvent}
          onAddEventOnDate={(date) => handleOpenNewEvent(date)}
        />
      </main>

      {/* Floating AI Chat Assistant Widget (Positioned above mobile FAB) */}
      <ChatWidget
        currentUser={currentUser}
        onJumpToDate={handleJumpToDate}
        onRefreshEvents={loadCalendarData}
      />

      {/* Mobile Floating Action Cluster (Add Event FAB & Holidays/Filter button in bottom-right) */}
      <div className="md:hidden fixed bottom-4 right-4 z-30 flex items-center gap-2.5 pointer-events-auto">
        <button
          id="mobile-holidays-fab"
          onClick={() => setIsMobileFilterSheetOpen(true)}
          className="h-12 px-3.5 rounded-2xl bg-[#ffffff] border border-[#dedad1] text-[#4a545e] hover:text-[#1f242b] shadow-[0_4px_14px_rgba(40,44,52,0.12)] active:scale-95 transition-all flex items-center gap-1.5 font-medium text-xs cursor-pointer"
          title="Holidays & Filters"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#4a545e]" strokeWidth={1.8} />
          <span>Holidays</span>
          <span className="text-sm">{selectedCountry === 'IN' ? '🇮🇳' : selectedCountry === 'US' ? '🇺🇸' : '🌐'}</span>
        </button>

        <button
          id="mobile-add-event-fab"
          onClick={() => handleOpenNewEvent()}
          className="w-13 h-13 rounded-2xl bg-[#2d3139] hover:bg-[#1a1c20] text-[#f7f9fa] shadow-[0_8px_24px_rgba(40,44,52,0.22)] active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-[#3e444d]"
          title="Add Event"
        >
          <Plus className="w-6 h-6 text-white" strokeWidth={2.2} />
        </button>
      </div>

      {/* Mobile Holidays & Filter Sheet */}
      <MobileFilterSheet
        isOpen={isMobileFilterSheetOpen}
        onClose={() => setIsMobileFilterSheetOpen(false)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedCountry={selectedCountry}
        onSelectCountry={setSelectedCountry}
        eventCountsByCategory={eventCountsByCategory}
        totalEventsCount={userEvents.length}
        holidaysThisMonthCount={holidaysThisMonth.length}
      />

      {/* Event Add/Edit Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialEvent={editingEvent}
        defaultDate={eventDefaultDate}
      />

      {/* Day Details Inspection Modal */}
      <DayDetailsModal
        isOpen={isDayDetailsOpen}
        onClose={() => setIsDayDetailsOpen(false)}
        date={selectedDayDate}
        events={selectedDayEvents}
        holidays={selectedDayHolidays}
        onAddEvent={(d) => {
          setIsDayDetailsOpen(false);
          handleOpenNewEvent(d);
        }}
        onSelectEvent={(evt) => {
          setIsDayDetailsOpen(false);
          handleSelectEvent(evt);
        }}
      />

      {/* User Switcher / Auth Modal */}
      <UserSwitcherModal
        isOpen={isUserSwitcherOpen}
        onClose={() => setIsUserSwitcherOpen(false)}
        currentUser={currentUser}
        users={allUsers}
        onSelectUser={handleSelectUser}
        onLoginAnother={handleLoginAnother}
        onLogout={handleLogout}
      />
    </div>
  );
}
