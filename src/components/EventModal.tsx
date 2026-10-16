import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Trash2, Clock, MapPin, AlignLeft, Calendar as CalendarIcon, Tag } from 'lucide-react';
import { CalendarEvent, EventCategory } from '../types';
import { CATEGORY_CONFIG } from '../lib/categoryConfig';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialEvent?: CalendarEvent | null;
  defaultDate?: string;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  defaultDate,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState<EventCategory>('personal');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || '');
      setDate(initialEvent.date || '');
      setAllDay(initialEvent.allDay ?? false);
      setStartTime(initialEvent.startTime || '09:00');
      setEndTime(initialEvent.endTime || '10:00');
      setCategory(initialEvent.category || 'personal');
      setLocation(initialEvent.location || '');
      setDescription(initialEvent.description || '');
    } else {
      setTitle('');
      setDate(defaultDate || '2026-09-22');
      setAllDay(false);
      setStartTime('10:00');
      setEndTime('11:00');
      setCategory('personal');
      setLocation('');
      setDescription('');
    }
    setShowDeleteConfirm(false);
  }, [initialEvent, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim(),
        date,
        allDay,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        category,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialEvent || !onDelete) return;
    try {
      setIsSubmitting(true);
      await onDelete(initialEvent.id);
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center sm:p-4 bg-[#fdfcf9] sm:bg-stone-900/40 sm:backdrop-blur-xs animate-in slide-in-from-bottom duration-250 sm:slide-in-from-bottom-0 sm:fade-in"
      id="event-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[#fdfcf9] sm:rounded-2xl sm:shadow-2xl sm:border border-[#dedad1] h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden"
        id="event-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close (X) or Back arrow at top-left */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-[#eeebe4] bg-[#fdfcf9] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              id="event-modal-close-button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#4a545e] hover:text-[#1f242b] hover:bg-[#f2efe9] active:bg-[#e8e4db] transition-colors cursor-pointer"
              title="Close / Back"
            >
              <ArrowLeft className="w-5 h-5 sm:hidden" strokeWidth={2} />
              <X className="w-5 h-5 hidden sm:block" strokeWidth={1.8} />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-[#1f242b] tracking-tight">
              {initialEvent ? 'Edit Event' : 'Add New Event'}
            </h2>
          </div>

          {initialEvent && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="p-2 rounded-xl text-[#8c5252] hover:bg-[#fbf4f4] transition-colors cursor-pointer"
              title="Delete Event"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.8} />
            </button>
          )}
        </div>

        {/* Form Body - scrollable with fixed bottom bar */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Event Title */}
          <div>
            <label htmlFor="event-title-input" className="block text-xs font-medium text-[#4a5568] mb-1">
              Event Title <span className="text-[#9e5454]">*</span>
            </label>
            <input
              id="event-title-input"
              type="text"
              required
              autoFocus
              placeholder="e.g. Design Sync, Dentist, Lunch with Sarah"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#dedad1] text-sm text-[#2d3139] placeholder:text-[#9aa0a6] focus:outline-hidden focus:ring-2 focus:ring-[#4a545e]/20 focus:border-[#4a545e] bg-[#f7f5f0] focus:bg-[#ffffff] transition-all"
            />
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-medium text-[#4a5568] mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-[#8c949e]" strokeWidth={1.5} />
              <span>Category</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const isSelected = category === cat;
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? `${config.bgClass} ring-1.5 ring-[#4a545e] font-semibold shadow-[0_1px_3px_rgba(40,44,52,0.08)]`
                        : 'bg-[#fcfbf9] text-[#55606d] border-[#dedad1] hover:bg-[#ffffff] hover:shadow-[0_1px_3px_rgba(40,44,52,0.04)]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: config.dotColor }}
                    />
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & All Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-date-input" className="block text-xs font-medium text-[#4a5568] mb-1 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-[#8c949e]" strokeWidth={1.5} />
                <span>Date</span>
              </label>
              <input
                id="event-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#dedad1] text-sm text-[#2d3139] focus:outline-hidden focus:ring-2 focus:ring-[#4a545e]/20 focus:border-[#4a545e] bg-[#f7f5f0] focus:bg-[#ffffff]"
              />
            </div>

            <div className="flex items-center sm:pt-6">
              <label className="inline-flex items-center gap-2.5 cursor-pointer text-sm text-[#4a5568] min-h-[44px]">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-[#4a545e] accent-[#4a545e] focus:ring-[#4a545e] border-[#dedad1]"
                />
                <span className="font-medium text-xs sm:text-sm">All Day Event</span>
              </label>
            </div>
          </div>

          {/* Time pickers (if not all day) */}
          {!allDay && (
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="event-start-time" className="block text-xs font-medium text-[#4a5568] mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#8c949e]" strokeWidth={1.5} />
                  <span>Start Time</span>
                </label>
                <input
                  id="event-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#dedad1] text-sm text-[#2d3139] focus:outline-hidden focus:ring-2 focus:ring-[#4a545e]/20 focus:border-[#4a545e] bg-[#f7f5f0] focus:bg-[#ffffff]"
                />
              </div>

              <div>
                <label htmlFor="event-end-time" className="block text-xs font-medium text-[#4a5568] mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#8c949e]" strokeWidth={1.5} />
                  <span>End Time</span>
                </label>
                <input
                  id="event-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#dedad1] text-sm text-[#2d3139] focus:outline-hidden focus:ring-2 focus:ring-[#4a545e]/20 focus:border-[#4a545e] bg-[#f7f5f0] focus:bg-[#ffffff]"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label htmlFor="event-location-input" className="block text-xs font-medium text-[#4a5568] mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#8c949e]" strokeWidth={1.5} />
              <span>Location (Optional)</span>
            </label>
            <input
              id="event-location-input"
              type="text"
              placeholder="e.g. Conference Room A, Virtual, 123 Main St"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#dedad1] text-sm text-[#2d3139] placeholder:text-[#9aa0a6] focus:outline-hidden focus:ring-2 focus:ring-[#4a545e]/20 focus:border-[#4a545e] bg-[#f7f5f0] focus:bg-[#ffffff]"
            />
          </div>

          {/* Description / Notes */}
          <div>
            <label htmlFor="event-description-input" className="block text-xs font-medium text-[#4a5568] mb-1 flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5 text-[#8c949e]" strokeWidth={1.5} />
              <span>Notes / Description</span>
            </label>
            <textarea
              id="event-description-input"
              rows={2}
              placeholder="Add agenda, meeting link, or reminder details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#dedad1] text-sm text-[#2d3139] placeholder:text-[#9aa0a6] focus:outline-hidden focus:ring-2 focus:ring-[#4a545e]/20 focus:border-[#4a545e] bg-[#f7f5f0] focus:bg-[#ffffff] resize-none"
            />
          </div>

          </div>

          {/* Fixed Bottom Action Bar for Easy Thumb Access */}
          <div className="p-3.5 sm:p-5 border-t border-[#eeebe4] bg-[#fdfcf9] pb-[max(16px,env(safe-area-inset-bottom))] shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            {showDeleteConfirm && (
              <div className="mb-3 p-2.5 bg-[#fbf4f4] border border-[#ecd5d5] rounded-xl flex items-center justify-between gap-2">
                <span className="text-xs text-[#8c5252] font-semibold">Delete event?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg bg-[#8c5252] text-white text-xs font-semibold shadow-xs"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-[#dedad1] text-xs font-medium text-[#4a5568]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:inline-flex px-4 py-2.5 min-h-[44px] rounded-xl border border-[#dedad1] bg-[#ffffff] text-[#55606d] hover:text-[#2d3139] hover:bg-[#f7f5f0] text-sm font-medium transition-all cursor-pointer items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="save-event-button"
                disabled={isSubmitting || !title.trim()}
                className="flex-1 py-3 px-5 min-h-[48px] rounded-xl bg-[#2d3139] hover:bg-[#1a1c20] hover:shadow-[0_2px_8px_rgba(40,44,52,0.14)] disabled:opacity-40 text-[#f7f9fa] text-sm font-semibold shadow-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Saving...' : initialEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
