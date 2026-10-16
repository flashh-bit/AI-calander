import { EventCategory } from '../types';

export interface CategoryInfo {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotColor: string;
}

export const CATEGORY_CONFIG: Record<EventCategory, CategoryInfo> = {
  meeting: {
    label: 'Meeting',
    bgClass: 'bg-[#edf2f7] text-[#334e68] border-[#d0dbe5]',
    textClass: 'text-[#334e68]',
    borderClass: 'border-[#d0dbe5]',
    dotColor: '#627d98',
  },
  work: {
    label: 'Work',
    bgClass: 'bg-[#f0f2f5] text-[#3b4752] border-[#d8dee4]',
    textClass: 'text-[#3b4752]',
    borderClass: 'border-[#d8dee4]',
    dotColor: '#718096',
  },
  personal: {
    label: 'Personal',
    bgClass: 'bg-[#f4f1f3] text-[#594854] border-[#dfd7dd]',
    textClass: 'text-[#594854]',
    borderClass: 'border-[#dfd7dd]',
    dotColor: '#8c7685',
  },
  health: {
    label: 'Health',
    bgClass: 'bg-[#edf3f0] text-[#2c4e3b] border-[#cbded3]',
    textClass: 'text-[#2c4e3b]',
    borderClass: 'border-[#cbded3]',
    dotColor: '#5a826d',
  },
  reminder: {
    label: 'Reminder',
    bgClass: 'bg-[#f6f3ee] text-[#5e4e3c] border-[#dfd8cc]',
    textClass: 'text-[#5e4e3c]',
    borderClass: 'border-[#dfd8cc]',
    dotColor: '#8f7e69',
  },
};
