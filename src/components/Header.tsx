import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { User, EventCategory } from '../types';
import { MONTH_NAMES, TODAY_ISO } from '../lib/dateUtils';
import { CATEGORY_CONFIG } from '../lib/categoryConfig';

interface HeaderProps {
  currentYear: number;
  currentMonth: number; // 1-12
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onOpenNewEvent: () => void;
  onOpenUserSwitcher: () => void;
  onLogout?: () => void;
  currentUser: User | null;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedCountry: string;
  onSelectCountry: (country: string) => void;
  eventCountsByCategory: Record<string, number>;
  totalEventsCount: number;
  holidaysThisMonthCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentYear,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onOpenNewEvent,
  onOpenUserSwitcher,
  onLogout,
  currentUser,
  selectedCategory,
  onSelectCategory,
  selectedCountry,
  onSelectCountry,
  eventCountsByCategory,
  totalEventsCount,
  holidaysThisMonthCount,
}) => {
  const monthName = MONTH_NAMES[currentMonth - 1];

  const [currentDateTime, setCurrentDateTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const actualTodayYear = currentDateTime.getFullYear();
  const actualTodayMonth = currentDateTime.getMonth() + 1;
  const isCurrentMonthActualToday = currentYear === actualTodayYear && currentMonth === actualTodayMonth;

  const formattedLiveDate = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedLiveTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="border-b border-[#e5e1d8] bg-[#fdfcf9] sticky top-0 z-30 shadow-2xs" id="calendar-header">
      {/* Top Bar: Compact on Mobile, Full on Desktop */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand & Mobile Month-Year (left-aligned) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#4a545e] text-[#f7f9fa] flex items-center justify-center shadow-2xs shrink-0">
              <CalendarIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#1f242b] leading-none">
                  Calendar
                </h1>
                <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full bg-[#eeebe4] text-[#4a5568] font-medium border border-[#dedad1] tracking-normal leading-none">
                  AI
                </span>
              </div>

              {/* Mobile Month & Year Display (Left-aligned right below app name) */}
              <div className="flex md:hidden items-center gap-1.5 mt-1">
                <span className="text-xs font-semibold text-[#4a5568] leading-none">
                  {monthName} {currentYear}
                </span>
                {!isCurrentMonthActualToday && (
                  <button
                    id="mobile-today-button"
                    onClick={onToday}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[#eeebe4] text-[#2d3139] font-medium border border-[#dedad1] leading-none active:scale-95 transition-all cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>

              {/* Desktop Subtitle with live date & time */}
              <p className="text-[11px] text-[#717a84] font-medium hidden md:block tracking-tight mt-0.5">
                Today is {formattedLiveDate} • <span className="font-semibold text-[#4a5568]">{formattedLiveTime}</span>
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Month / Year Navigator (hidden on mobile, shown on md+) */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#f2efe9] p-1 rounded-xl border border-[#dedad1]">
            <button
              id="prev-month-button"
              onClick={onPrevMonth}
              title="Previous Month"
              className="p-1.5 rounded-lg text-[#55606d] hover:text-[#2d3139] hover:bg-[#ffffff] hover:shadow-[0_1px_3px_rgba(40,44,52,0.06)] transition-all cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <span className="px-3 text-sm sm:text-base font-bold text-[#1f242b] tracking-tight min-w-[140px] text-center select-none leading-none">
              {monthName} {currentYear}
            </span>

            <button
              id="next-month-button"
              onClick={onNextMonth}
              title="Next Month"
              className="p-1.5 rounded-lg text-[#55606d] hover:text-[#2d3139] hover:bg-[#ffffff] hover:shadow-[0_1px_3px_rgba(40,44,52,0.06)] transition-all cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>

            {!isCurrentMonthActualToday && (
              <button
                id="today-button"
                onClick={onToday}
                className="text-xs px-2.5 py-1 rounded-md bg-[#ffffff] text-[#4a545e] font-medium shadow-[0_1px_2px_rgba(40,44,52,0.05)] hover:bg-[#f6f4ee] hover:shadow-[0_1px_4px_rgba(40,44,52,0.08)] border border-[#dedad1] ml-1 transition-all cursor-pointer"
              >
                Today
              </button>
            )}
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Mobile Navigation Arrows (Placed close together on the right) */}
            <div className="flex md:hidden items-center bg-[#f2efe9] rounded-xl p-0.5 border border-[#dedad1]">
              <button
                id="mobile-prev-month-button"
                onClick={onPrevMonth}
                title="Previous Month"
                className="w-8 h-8 rounded-lg text-[#4a545e] hover:text-[#1f242b] active:bg-[#ffffff] flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.8} />
              </button>
              <div className="w-px h-3.5 bg-[#dedad1]" />
              <button
                id="mobile-next-month-button"
                onClick={onNextMonth}
                title="Next Month"
                className="w-8 h-8 rounded-lg text-[#4a545e] hover:text-[#1f242b] active:bg-[#ffffff] flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>

            {/* User selector (Mobile icon-only, full on desktop) */}
            <button
              id="user-profile-button"
              onClick={onOpenUserSwitcher}
              title="Account Settings"
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 min-h-[36px] sm:min-h-[40px] rounded-xl border border-[#dedad1] bg-[#fbfbf9] hover:bg-[#ffffff] hover:shadow-[0_1px_4px_rgba(40,44,52,0.06)] active:scale-95 transition-all text-left cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-[#e8e4db] text-[#4a545e] flex items-center justify-center text-xs font-semibold uppercase shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0) : <UserIcon className="w-3.5 h-3.5" strokeWidth={1.5} />}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-medium text-[#2d3139] leading-none">
                  {currentUser?.name || currentUser?.email || 'Account'}
                </p>
                <p className="text-[10px] text-[#717a84] leading-none mt-0.5">
                  Account settings
                </p>
              </div>
            </button>

            {/* Quick Log Out button */}
            {onLogout && currentUser && (
              <button
                id="header-logout-button"
                onClick={onLogout}
                title="Log Out"
                className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 min-h-[36px] sm:min-h-[40px] rounded-xl border border-[#dedad1] bg-[#fbfbf9] hover:bg-rose-50/80 hover:border-rose-200 text-[#717a84] hover:text-rose-700 active:scale-95 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.6} />
                <span className="hidden xl:inline text-xs font-medium">Log out</span>
              </button>
            )}

            {/* Desktop New Event Button (Hidden on mobile - moved to bottom FAB) */}
            <button
              id="new-event-button"
              onClick={onOpenNewEvent}
              title="Add New Event"
              className="hidden md:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4a545e] hover:bg-[#3f4750] hover:shadow-[0_2px_8px_rgba(40,44,52,0.12)] text-[#f7f9fa] font-medium text-xs sm:text-sm shadow-2xs transition-all cursor-pointer active:scale-[0.98] min-h-[40px] shrink-0"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              <span>New Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sub-bar: Category filters & region selector (hidden on mobile, moved to bottom quick actions) */}
      <div
        className="hidden md:flex max-w-7xl mx-auto px-6 py-2 border-t border-[#eeebe4] text-xs items-center justify-between gap-3 overflow-x-auto no-scrollbar"
        id="calendar-filter-bar"
      >
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap text-xs flex items-center justify-center ${
              selectedCategory === 'all'
                ? 'bg-[#4a545e] text-[#f7f9fa] shadow-[0_1px_3px_rgba(40,44,52,0.1)]'
                : 'bg-[#f0eee9] text-[#55606d] hover:bg-[#e7e4dc] hover:text-[#2d3139]'
            }`}
          >
            All Events ({totalEventsCount})
          </button>

          {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const isSelected = selectedCategory === cat;
            const count = eventCountsByCategory[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-2.5 py-1.5 min-h-[36px] rounded-lg font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-xs ${
                  isSelected
                    ? 'bg-[#4a545e] text-[#f7f9fa] shadow-[0_1px_3px_rgba(40,44,52,0.1)]'
                    : 'bg-[#faf9f6] text-[#55606d] hover:bg-[#ffffff] hover:text-[#2d3139] hover:shadow-[0_1px_3px_rgba(40,44,52,0.04)] border border-[#dedad1]'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? '#f7f9fa' : config.dotColor }}
                />
                <span>{config.label}</span>
                <span className="opacity-70 text-[11px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Holidays badge & region selector */}
        <div className="flex items-center justify-end gap-2 text-[#55606d] shrink-0">
          <div className="inline-flex items-center rounded-lg p-0.5 bg-[#eeebe4] border border-[#dedad1] text-[11px]">
            <button
              onClick={() => onSelectCountry('IN')}
              className={`px-2.5 py-1 min-h-[32px] rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCountry === 'IN'
                  ? 'bg-[#ffffff] text-[#2d3139] shadow-[0_1px_3px_rgba(40,44,52,0.06)] font-semibold'
                  : 'text-[#55606d] hover:text-[#2d3139] hover:bg-[#e8e4dc]/50'
              }`}
            >
              <span>🇮🇳</span>
              <span>India</span>
            </button>
            <button
              onClick={() => onSelectCountry('all')}
              className={`px-2.5 py-1 min-h-[32px] rounded-md font-medium transition-all cursor-pointer ${
                selectedCountry === 'all'
                  ? 'bg-[#ffffff] text-[#2d3139] shadow-[0_1px_3px_rgba(40,44,52,0.06)] font-semibold'
                  : 'text-[#55606d] hover:text-[#2d3139] hover:bg-[#e8e4dc]/50'
              }`}
            >
              All Regions
            </button>
            <button
              onClick={() => onSelectCountry('US')}
              className={`px-2.5 py-1 min-h-[32px] rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCountry === 'US'
                  ? 'bg-[#ffffff] text-[#2d3139] shadow-[0_1px_3px_rgba(40,44,52,0.06)] font-semibold'
                  : 'text-[#55606d] hover:text-[#2d3139] hover:bg-[#e8e4dc]/50'
              }`}
            >
              <span>🇺🇸</span>
              <span>US</span>
            </button>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#faf6f3] text-[#5c463e] border border-[#ece0d8] text-[11px] font-medium shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c08468]" /> {holidaysThisMonthCount} Holiday{holidaysThisMonthCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </header>
  );
};
