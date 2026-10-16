import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  isLoading: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = () => {
  return (
    <motion.div
      key="app-splash-screen"
      id="app-splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f7f6f2] select-none p-6"
    >
      <div className="flex flex-col items-center">
        {/* App Logo & Name */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-[#4a545e] text-[#f7f9fa] flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-6 h-6 sm:w-6.5 sm:h-6.5" strokeWidth={1.75} />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1f242b] leading-none">
              Calendar
            </h1>
            <span className="text-xs sm:text-[13px] px-2 py-0.5 rounded-full bg-[#eeebe4] text-[#4a5568] font-medium border border-[#dedad1] tracking-normal leading-none">
              AI
            </span>
          </div>
        </div>

        {/* Subtle loading indicator: Refined, whisper-thin progress bar */}
        <div
          id="splash-loading-indicator"
          className="w-36 sm:w-44 h-1 bg-[#e5e1d8] rounded-full overflow-hidden relative"
          aria-label="Loading calendar application"
        >
          <motion.div
            className="absolute top-0 bottom-0 left-0 bg-[#4a545e] rounded-full"
            initial={{ x: '-100%', width: '40%' }}
            animate={{
              x: ['-100%', '250%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.35,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};
