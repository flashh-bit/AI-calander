import React from 'react';
import { X, SlidersHorizontal, Check } from 'lucide-react';
import { EventCategory } from '../types';
import { CATEGORY_CONFIG } from '../lib/categoryConfig';

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedCountry: string;
  onSelectCountry: (country: string) => void;
  eventCountsByCategory: Record<string, number>;
  totalEventsCount: number;
  holidaysThisMonthCount: number;
}

export const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  selectedCountry,
  onSelectCountry,
  eventCountsByCategory,
  totalEventsCount,
  holidaysThisMonthCount,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200 md:hidden"
      id="mobile-filter-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full bg-[#fdfcf9] rounded-t-3xl shadow-2xl border-t border-[#dedad1] max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250"
        id="mobile-filter-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-full pt-3 pb-1 flex justify-center bg-[#fdfcf9]">
          <div className="w-12 h-1.5 bg-[#d2ccc0] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#eeebe4]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#4a545e]" strokeWidth={1.8} />
            <h2 className="text-base font-bold text-[#1f242b]">Holidays & Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8c949e] hover:text-[#2d3139] hover:bg-[#f2efe9] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Public Holidays Region */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#717a84]">
                Public Holidays Region
              </label>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#faf6f3] text-[#5c463e] border border-[#ece0d8] font-medium">
                {holidaysThisMonthCount} this month
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSelectCountry('IN')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  selectedCountry === 'IN'
                    ? 'bg-[#4a545e] text-white border-[#4a545e] shadow-sm'
                    : 'bg-[#faf9f6] text-[#4a545e] border-[#dedad1] hover:bg-white'
                }`}
              >
                <span className="text-xl">🇮🇳</span>
                <span>India</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectCountry('US')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  selectedCountry === 'US'
                    ? 'bg-[#4a545e] text-white border-[#4a545e] shadow-sm'
                    : 'bg-[#faf9f6] text-[#4a545e] border-[#dedad1] hover:bg-white'
                }`}
              >
                <span className="text-xl">🇺🇸</span>
                <span>US</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectCountry('all')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  selectedCountry === 'all'
                    ? 'bg-[#4a545e] text-white border-[#4a545e] shadow-sm'
                    : 'bg-[#faf9f6] text-[#4a545e] border-[#dedad1] hover:bg-white'
                }`}
              >
                <span className="text-xl">🌍</span>
                <span>All Regions</span>
              </button>
            </div>
          </div>

          {/* Event Categories */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#717a84] mb-2.5">
              Filter by Category
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#4a545e] text-white border-[#4a545e] shadow-xs'
                    : 'bg-[#faf9f6] text-[#55606d] border-[#dedad1] hover:bg-white'
                }`}
              >
                {selectedCategory === 'all' && <Check className="w-3.5 h-3.5" />}
                <span>All Categories ({totalEventsCount})</span>
              </button>

              {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const isSelected = selectedCategory === cat;
                const count = eventCountsByCategory[cat] || 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all inline-flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#4a545e] text-white border-[#4a545e] shadow-xs'
                        : 'bg-[#faf9f6] text-[#55606d] border-[#dedad1] hover:bg-white'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? '#ffffff' : config.dotColor }}
                    />
                    <span>{config.label}</span>
                    <span className="opacity-75 text-[11px]">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Fixed Action */}
        <div className="p-4 border-t border-[#eeebe4] bg-[#fdfcf9] pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 min-h-[46px] rounded-xl bg-[#2d3139] text-white text-sm font-semibold shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
