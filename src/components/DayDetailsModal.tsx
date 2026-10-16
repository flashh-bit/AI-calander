import React from 'react';
import { X, ArrowLeft, Plus, Star, Clock, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarEvent, Holiday } from '../types';
import { CATEGORY_CONFIG } from '../lib/categoryConfig';
import { formatHumanDate } from '../lib/dateUtils';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  events: CalendarEvent[];
  holidays: Holiday[];
  onAddEvent: (date: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  isOpen,
  onClose,
  date,
  events,
  holidays,
  onAddEvent,
  onSelectEvent,
}) => {
  if (!isOpen) return null;

  const formattedDate = formatHumanDate(date);
  const isToday = date === '2026-09-22';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center sm:p-4 bg-[#fdfcf9] sm:bg-stone-900/40 sm:backdrop-blur-xs animate-in slide-in-from-bottom duration-250 sm:slide-in-from-bottom-0 sm:fade-in"
      id="day-details-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#fdfcf9] sm:rounded-2xl sm:shadow-2xl sm:border border-[#dedad1] h-full sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden"
        id="day-details-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with back/close button at top-left */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-[#eeebe4] bg-[#f8f6f0] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#4a545e] hover:text-[#1f242b] hover:bg-[#eae6dc] transition-colors cursor-pointer"
              title="Back / Close"
            >
              <ArrowLeft className="w-5 h-5 sm:hidden" strokeWidth={2} />
              <X className="w-5 h-5 hidden sm:block" strokeWidth={1.8} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#e8e4db] text-[#4a545e] flex items-center justify-center shadow-2xs shrink-0">
                <CalendarIcon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#2d3139] leading-tight tracking-tight">
                  {formattedDate}
                </h2>
                {isToday && (
                  <span className="text-[10px] font-semibold text-[#3e566d] uppercase tracking-wider">
                    Today
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Public & National Holidays section */}
          {holidays.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5c463e] mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#c08468]" />
                <span>Public & National Holidays (All Users)</span>
              </h3>
              <div className="space-y-2">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-[#faf6f3] border border-[#ece0d8] text-[#5c463e] flex items-start justify-between gap-2 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c08468] shrink-0" />
                        <p className="font-semibold text-sm text-[#45332c]">{h.name}</p>
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f2e6de] text-[#5c463e] border border-[#e5d4cb]">
                          Holiday
                        </span>
                        {h.country && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-[#ffffff] border border-[#ebdcd3] text-[#5c463e]">
                            {h.country === 'IN' ? '🇮🇳 India' : h.country === 'US' ? '🇺🇸 US' : h.country}
                          </span>
                        )}
                      </div>
                      {h.description && (
                        <p className="text-xs text-[#6e584f] mt-1 leading-relaxed">{h.description}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f2e6de] text-[#5c463e] shrink-0">
                      {h.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Events section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8c949e]">
                Your Scheduled Events ({events.length})
              </h3>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-6 px-4 bg-[#f7f5f0] rounded-xl border border-dashed border-[#dedad1]">
                <p className="text-sm text-[#717a84]">No events scheduled on this date.</p>
                <button
                  onClick={() => onAddEvent(date)}
                  className="mt-2 min-h-[40px] px-3 text-xs sm:text-sm font-medium text-[#4a545e] hover:text-[#1f242b] inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  <span>Schedule an event</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((evt) => {
                  const config = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG.personal;
                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      className={`p-3.5 rounded-xl border transition-all hover:shadow-[0_2px_8px_rgba(40,44,52,0.06)] hover:brightness-[0.99] active:scale-[0.99] cursor-pointer flex flex-col gap-1 ${config.bgClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold text-sm">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: config.dotColor }}
                          />
                          <span>{evt.title}</span>
                        </div>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-white/70 border border-black/5">
                          {config.label}
                        </span>
                      </div>

                      {evt.allDay ? (
                        <div className="text-xs text-[#55606d] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#8c949e]" strokeWidth={1.5} />
                          <span>All Day</span>
                        </div>
                      ) : evt.startTime ? (
                        <div className="text-xs text-[#55606d] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#8c949e]" strokeWidth={1.5} />
                          <span>
                            {evt.startTime} {evt.endTime ? `- ${evt.endTime}` : ''}
                          </span>
                        </div>
                      ) : null}

                      {evt.location && (
                        <div className="text-xs text-[#55606d] flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#8c949e]" strokeWidth={1.5} />
                          <span className="truncate">{evt.location}</span>
                        </div>
                      )}

                      {evt.description && (
                        <p className="text-xs text-[#55606d] mt-1 line-clamp-2">
                          {evt.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 sm:py-3.5 border-t border-[#eeebe4] bg-[#f8f6f0] pb-[max(14px,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => onAddEvent(date)}
            className="flex-1 py-3 px-4 min-h-[46px] rounded-xl bg-[#2d3139] hover:bg-[#1a1c20] hover:shadow-[0_2px_8px_rgba(40,44,52,0.12)] text-[#f7f9fa] text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.99] flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" strokeWidth={1.8} />
            <span>Add Event for Date</span>
          </button>
          <button
            onClick={onClose}
            className="hidden sm:inline-flex px-4 py-2.5 min-h-[44px] rounded-xl border border-[#dedad1] bg-[#ffffff] text-[#55606d] hover:text-[#2d3139] hover:bg-[#f7f5f0] text-sm font-medium transition-all cursor-pointer items-center justify-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
