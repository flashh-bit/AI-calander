import React from 'react';
import { CalendarDayCell, WEEKDAYS_SHORT } from '../lib/dateUtils';
import { CalendarEvent, Holiday } from '../types';
import { CATEGORY_CONFIG } from '../lib/categoryConfig';
import { Plus, Clock } from 'lucide-react';

interface CalendarGridProps {
  cells: CalendarDayCell[];
  events: CalendarEvent[];
  holidays: Holiday[];
  onSelectDate: (date: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onAddEventOnDate: (date: string) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  cells,
  events,
  holidays,
  onSelectDate,
  onSelectEvent,
  onAddEventOnDate,
}) => {
  // Map events by date YYYY-MM-DD
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of events) {
      const list = map.get(evt.date) || [];
      list.push(evt);
      map.set(evt.date, list);
    }
    return map;
  }, [events]);

  // Map holidays by date YYYY-MM-DD
  const holidaysByDate = React.useMemo(() => {
    const map = new Map<string, Holiday[]>();
    for (const hol of holidays) {
      const list = map.get(hol.date) || [];
      list.push(hol);
      map.set(hol.date, list);
    }
    return map;
  }, [holidays]);

  const WEEKDAYS_MOBILE = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-6 py-0 sm:py-4 pb-28 md:pb-6 overflow-x-hidden" id="calendar-grid-container">
      {/* Legend & Summary Bar */}
      <div className="flex items-center justify-between py-1.5 px-3 sm:px-1 text-[11px] sm:text-xs text-[#717a84] bg-[#fbfbf9] sm:bg-transparent border-b sm:border-b-0 border-[#eeebe4]">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#627d98]" />
            <span className="text-[#4a5568]">Your Events</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#c08468]" />
            <span className="text-[#4a5568]">Public Holidays</span>
          </div>
        </div>
        <span className="text-[11px] text-[#8c949e] hidden sm:inline">
          Tap any date to view schedule or add events
        </span>
      </div>

      {/* Weekday headers sticky above the grid */}
      <div className="sticky top-[52px] sm:top-[68px] z-20 bg-[#fdfcf9]/95 backdrop-blur-xs border-b border-[#e5e1d8] shadow-2xs py-2 px-1 sm:px-0">
        <div className="grid grid-cols-7 gap-px text-center text-[10px] sm:text-[11px] font-bold text-[#717a84] uppercase tracking-wider leading-none">
          {WEEKDAYS_SHORT.map((day, idx) => (
            <div key={day} className={`py-0.5 ${idx === 0 || idx === 6 ? 'text-[#8c949e]' : 'text-[#55606d]'}`}>
              <span>{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid of cells with subtle soft gray borders - full-width on mobile */}
      <div className="grid grid-cols-7 gap-px bg-[#e5e7eb] rounded-none sm:rounded-xl overflow-hidden border-b sm:border border-[#e5e7eb] shadow-2xs w-full">
        {cells.map(cell => {
          const dayEvents = eventsByDate.get(cell.date) || [];
          const dayHolidays = holidaysByDate.get(cell.date) || [];
          const hasHoliday = dayHolidays.length > 0;
          const hasEvents = dayEvents.length > 0;
          const totalItems = dayEvents.length + dayHolidays.length;
          const maxVisible = 3;
          const overflowCount = totalItems > maxVisible ? totalItems - maxVisible : 0;

          // Determine cell styling with very light neutral background and soft muted accent for today
          let cellStyle = 'bg-[#fcfbf9] hover:bg-[#f6f5f1]';
          let borderHighlight = '';

          if (!cell.isCurrentMonth) {
            cellStyle = 'bg-[#f4f5f7]/85 text-[#9ca3af] hover:bg-[#eaecee]';
          } else if (cell.isToday) {
            cellStyle = 'bg-[#edf3f8] ring-1 ring-inset ring-[#cbd5e1] font-medium hover:bg-[#e4edf5]';
          } else if (hasHoliday && hasEvents) {
            cellStyle = 'bg-[#faf8f5] hover:bg-[#f4f0ea]';
            borderHighlight = 'hover:ring-1 hover:ring-[#d5cfc5]';
          } else if (hasHoliday) {
            cellStyle = 'bg-[#faf8f5] hover:bg-[#f4f0ea]';
            borderHighlight = 'hover:ring-1 hover:ring-[#d5cfc5]';
          } else if (hasEvents) {
            cellStyle = 'bg-[#fcfbf9] hover:bg-[#f3f6f9]';
            borderHighlight = 'hover:ring-1 hover:ring-[#cbd5e1]';
          }

          return (
            <div
              key={cell.date}
              id={`day-cell-${cell.date}`}
              onClick={() => onSelectDate(cell.date)}
              className={`min-h-[60px] xs:min-h-[72px] sm:min-h-[114px] md:min-h-[136px] p-1 sm:p-2 sm:p-2.5 flex flex-col justify-between transition-all duration-150 ease-out relative group cursor-pointer ${cellStyle} ${borderHighlight}`}
            >
              {/* Day Header: Date Number, Indicators, and quick add action */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-0.5 sm:mb-1.5">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {/* Day Number Pill in medium weight */}
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 text-[11px] sm:text-xs md:text-sm font-medium rounded-full transition-transform group-hover:scale-105 tracking-normal leading-none ${
                        cell.isToday
                          ? 'bg-[#d8e2ec] text-[#243b53] font-medium ring-1 ring-[#b4c6d8]'
                          : cell.isCurrentMonth
                          ? 'text-[#2d3139] font-medium group-hover:text-[#486581]'
                          : 'text-[#9aa0a6] font-normal'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Today Marker on desktop */}
                    {cell.isToday && (
                      <span className="text-[10px] uppercase font-semibold text-[#486581] tracking-wider hidden md:inline">
                        Today
                      </span>
                    )}

                    {/* Small low-saturation dot indicator for Public Holiday (dusty terracotta) */}
                    {hasHoliday && (
                      <span
                        title={`${dayHolidays.length} Public Holiday${dayHolidays.length > 1 ? 's' : ''}`}
                        className="inline-flex items-center justify-center shrink-0"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c08468]" />
                      </span>
                    )}

                    {/* Active Event Dot Indicator (desktop) */}
                    {hasEvents && !hasHoliday && (
                      <span
                        title={`${dayEvents.length} Event${dayEvents.length > 1 ? 's' : ''}`}
                        className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#627d98] shrink-0 group-hover:scale-125 transition-transform"
                      />
                    )}
                  </div>

                  {/* Hover Quick Add Action Button (desktop) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddEventOnDate(cell.date);
                    }}
                    title={`Add event on ${cell.date}`}
                    className="hidden sm:flex opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 p-1 rounded-md text-[#55606d] hover:text-[#1f242b] hover:bg-[#ffffff] hover:shadow-[0_1px_3px_rgba(40,44,52,0.08)] transition-all duration-150 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Mobile-Only Compact Indicators (< sm:) */}
                <div className="sm:hidden space-y-1 mt-0.5">
                  {hasHoliday && (
                    <div className="flex items-center gap-1 text-[9px] text-[#5c463e] font-medium leading-none truncate bg-[#faf6f3] px-1 py-0.5 rounded border border-[#ece0d8]/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c08468] shrink-0" />
                      <span className="truncate">{dayHolidays[0].name}</span>
                    </div>
                  )}

                  {hasEvents && (
                    <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                      {dayEvents.slice(0, 3).map((evt, idx) => (
                        <span
                          key={idx}
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_CONFIG[evt.category]?.dotColor || '#627d98' }}
                          title={evt.title}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] text-[#717a84] font-medium leading-none">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Desktop & Tablet Holiday Items (sm: and up) */}
                {hasHoliday && (
                  <div className="hidden sm:block mb-1.5 space-y-1">
                    {dayHolidays.map(hol => (
                      <div
                        key={hol.id}
                        title={`Public Holiday (${hol.country === 'IN' ? '🇮🇳 India' : hol.country}): ${hol.name}${hol.description ? ` — ${hol.description}` : ''}`}
                        className="px-2 py-0.5 sm:py-1 rounded-md bg-[#faf6f3] border border-[#ece0d8] text-[#5c463e] text-[10px] sm:text-[11px] font-medium flex items-center justify-between gap-1.5 shadow-2xs hover:border-[#dfcec3] transition-colors"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c08468] shrink-0" />
                          <span className="truncate">{hol.name}</span>
                        </div>
                        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-xs bg-[#f2e6de] text-[#5c463e] border border-[#e5d4cb] font-medium shrink-0">
                          Holiday
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Desktop & Tablet Regular Event Chips (sm: and up) */}
                <div className="hidden sm:block space-y-1">
                  {dayEvents.slice(0, maxVisible - dayHolidays.length).map(evt => {
                    const config = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG.personal;
                    return (
                      <button
                        key={evt.id}
                        id={`event-chip-${evt.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(evt);
                        }}
                        title={`${evt.title} ${evt.startTime ? `(${evt.startTime})` : ''}`}
                        className={`w-full text-left px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] border font-medium truncate flex items-center gap-1.5 transition-all hover:brightness-[0.98] hover:shadow-[0_2px_6px_rgba(40,44,52,0.06)] active:scale-[0.99] cursor-pointer shadow-2xs ${config.bgClass}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: config.dotColor }}
                        />
                        {evt.startTime && !evt.allDay ? (
                          <span className="opacity-75 text-[10px] font-mono shrink-0 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 opacity-60 inline" strokeWidth={1.5} />
                            {evt.startTime}
                          </span>
                        ) : null}
                        <span className="truncate">{evt.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overflow Indicator (+X more) */}
              {overflowCount > 0 && (
                <div className="text-[9px] sm:text-[10px] text-[#717a84] font-medium px-0.5 sm:px-1 pt-0.5 hover:text-[#486581] transition-colors flex items-center gap-1">
                  <span>+{overflowCount} more</span>
                  <span className="text-[#c08468] hidden sm:inline">•</span>
                  <span className="text-[9px] text-[#8c949e] hidden sm:inline">View day</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
