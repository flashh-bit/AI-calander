import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Trash2,
  Calendar,
  ChevronDown,
  CheckCircle2,
  CornerDownLeft,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, User } from '../types';
import { api } from '../lib/api';

interface ChatWidgetProps {
  currentUser: User | null;
  onJumpToDate?: (date: string) => void;
  onRefreshEvents?: () => void;
}

const DEFAULT_SUGGESTIONS = [
  'How many holidays are there this month?',
  'When is Diwali in 2026?',
  'What events do I have on the 15th?',
  'When is the next holiday?',
  'Holidays in India this year',
];

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  currentUser,
  onJumpToDate,
  onRefreshEvents,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `Hello ${
        currentUser?.name ? currentUser.name.split(' ')[0] : 'there'
      }! I'm your calendar assistant. Ask me anything about your scheduled events or public holidays.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track window resize for mobile vs tablet/desktop layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update welcome greeting when active user changes
  useEffect(() => {
    if (currentUser) {
      setMessages([
        {
          id: `welcome-${currentUser.id}`,
          sender: 'assistant',
          text: `Hello ${
            currentUser.name ? currentUser.name.split(' ')[0] : 'there'
          }! Logged in as ${currentUser.name}. Ask me anything about your private schedule or upcoming public holidays.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [currentUser?.id, currentUser?.name]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyPayload = newMessages
        .slice(-6)
        .map((m) => ({ sender: m.sender, text: m.text }));

      const res = await api.sendChatMessage(query, historyPayload);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        queryDetails: res.queryDetails,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (res.eventsUpdated && onRefreshEvents) {
        onRefreshEvents();
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: "I couldn't reach the calendar query engine right now. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Chat cleared. Ask me anything about your events or public holidays!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-stone-900/25 backdrop-blur-2xs z-[59]"
            id="chat-backdrop"
          />
        )}
      </AnimatePresence>

      {/* Floating Toggle Button (Anchored in bottom-right corner with 16-24px margins and clearance above FAB) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            key="chat-floating-button-wrapper"
            className="fixed bottom-[84px] right-4 md:bottom-6 md:right-6 z-[60] pointer-events-auto"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
          >
            <motion.button
              id="chat-floating-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="w-12 h-12 rounded-2xl bg-[#ffffff] border border-[#dedad1] text-[#4a545e] hover:text-[#1f242b] hover:border-[#4a545e] shadow-[0_4px_16px_rgba(40,44,52,0.1),0_1px_3px_rgba(40,44,52,0.06)] hover:shadow-[0_6px_20px_rgba(40,44,52,0.15)] flex items-center justify-center transition-all cursor-pointer group active:scale-95"
              title="Calendar AI Assistant"
            >
              <MessageSquare className="w-5 h-5 text-[#4a545e] group-hover:text-[#1f242b] transition-colors" strokeWidth={1.5} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Panel Wrapper (Expanding smoothly from that exact corner) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-assistant-panel"
            id="chat-assistant-panel"
            initial={{
              opacity: 0,
              scale: 0.15,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.15,
            }}
            transition={{
              duration: 0.26,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              transformOrigin: isMobile
                ? 'calc(100% - 24px) calc(100% - 92px)'
                : 'bottom right',
            }}
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] pointer-events-auto w-[calc(100vw-32px)] max-w-[400px] md:w-[420px] md:max-w-none h-[calc(100dvh-80px)] max-h-[580px] bg-[#faf9f5] rounded-2xl border border-[#dedad1] shadow-[0_20px_48px_rgba(40,44,52,0.16),0_4px_12px_rgba(40,44,52,0.06)] flex flex-col overflow-hidden"
          >
              {/* Panel Header in Soft Neutral */}
              <div className="px-4 py-3 bg-[#f6f4ee] text-[#2d3139] flex items-center justify-between select-none border-b border-[#eae5db] shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#ebe6dc] text-[#454f59] flex items-center justify-center border border-[#ded8cb] shadow-xs">
                    <Sparkles className="w-4 h-4 text-[#454f59]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2 leading-none text-[#1f242b]">
                      <span>Calendar Assistant</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#e8f1eb] text-[10px] font-semibold text-[#335d40] border border-[#cbe1d1]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#487a55] animate-pulse" />
                        Live
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#717a84] mt-1 leading-none">
                      Accurate schedule & holiday intelligence
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleClearChat}
                    title="Clear conversation"
                    className="p-1.5 rounded-lg text-[#717a84] hover:text-[#1f242b] hover:bg-[#eae5db] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    id="chat-close-button"
                    onClick={() => setIsOpen(false)}
                    title="Close assistant"
                    className="p-1.5 rounded-lg text-[#717a84] hover:text-[#1f242b] hover:bg-[#eae5db] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Messages Container with Soft Neutral Background */}
              <div
                className="flex-1 px-4 py-5 sm:px-5 sm:py-6 overflow-y-auto space-y-5 sm:space-y-6 bg-[#f3f0e8]/80"
                id="chat-messages-container"
              >
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';

                  if (isUser) {
                    return (
                      <div
                        key={msg.id}
                        className="flex flex-col items-end pl-8"
                      >
                        {/* User Message Bubble in Muted Slate Accent with Gentle Shadow */}
                        <div className="rounded-2xl rounded-tr-xs px-4 py-3 sm:px-4.5 sm:py-3.5 bg-[#454f59] text-[#f8f9fa] shadow-[0_2px_8px_rgba(69,79,89,0.18)] text-[13px] leading-relaxed font-normal">
                          <div className="whitespace-pre-wrap font-sans">
                            {msg.text}
                          </div>
                        </div>
                        <span className="text-[10.5px] text-[#8c949e] mt-1.5 px-1 font-medium select-none">
                          {msg.timestamp}
                        </span>
                      </div>
                    );
                  }

                  // Assistant Message Bubble in Clean Soft Neutral Shade with Gentle Shadow
                  return (
                    <div
                      key={msg.id}
                      className="flex items-start gap-2.5 sm:gap-3 pr-4"
                    >
                      <div className="w-7 h-7 rounded-xl bg-[#ffffff] border border-[#e8e4dc] flex items-center justify-center text-[#454f59] shadow-xs shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#454f59]" strokeWidth={1.5} />
                      </div>

                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <div className="w-full rounded-2xl rounded-tl-xs px-4 py-3 sm:px-4.5 sm:py-3.5 bg-[#ffffff] text-[#2d3139] border border-[#ede9e1] shadow-[0_2px_8px_rgba(45,49,57,0.05),0_1px_2px_rgba(45,49,57,0.03)] text-[13px] leading-relaxed font-normal">
                          {/* Rich message text */}
                          <div className="whitespace-pre-wrap font-sans">
                            {renderMessageWithMarkdown(msg.text)}
                          </div>

                          {/* Grounded data status badge */}
                          {msg.queryDetails && (
                            <div className="mt-3 pt-2.5 border-t border-[#f0ece4] flex items-center gap-1.5 text-[11px] text-[#365942] font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#427351] shrink-0" strokeWidth={1.5} />
                              <span>Verified against calendar database</span>
                            </div>
                          )}

                          {/* Interactive date shortcut */}
                          {msg.queryDetails?.date && onJumpToDate && (
                            <button
                              onClick={() => onJumpToDate(msg.queryDetails!.date!)}
                              className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#364049] hover:text-[#1f242b] bg-[#f5f2eb] hover:bg-[#ece7de] hover:shadow-[0_1px_3px_rgba(40,44,52,0.06)] px-3 py-1.5 rounded-lg transition-all cursor-pointer border border-[#ded7ca] shadow-2xs"
                            >
                              <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                              <span>View {msg.queryDetails.date} on calendar</span>
                            </button>
                          )}
                        </div>

                        <span className="text-[10.5px] text-[#8c949e] mt-1.5 px-1 font-medium select-none">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Subtle Typing Indicator with Gentle Shadow */}
                <AnimatePresence>
                  {isLoading && (
                    <motion.div
                      key="typing-indicator"
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-2.5 sm:gap-3"
                    >
                      <div className="w-7 h-7 rounded-xl bg-[#ffffff] border border-[#e8e4dc] flex items-center justify-center text-[#454f59] shadow-xs shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#454f59]" strokeWidth={1.5} />
                      </div>

                      <div className="bg-[#ffffff] border border-[#ede9e1] rounded-2xl rounded-tl-xs px-4 py-3 shadow-[0_2px_8px_rgba(45,49,57,0.05)] flex items-center gap-3">
                        {/* Staggered bouncing indicator dots */}
                        <div className="flex items-center gap-1.5 px-0.5">
                          <motion.span
                            animate={{ y: [0, -3.5, 0], opacity: [0.35, 1, 0.35] }}
                            transition={{
                              duration: 0.85,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: 0,
                            }}
                            className="w-1.5 h-1.5 rounded-full bg-[#454f59]"
                          />
                          <motion.span
                            animate={{ y: [0, -3.5, 0], opacity: [0.35, 1, 0.35] }}
                            transition={{
                              duration: 0.85,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: 0.18,
                            }}
                            className="w-1.5 h-1.5 rounded-full bg-[#454f59]"
                          />
                          <motion.span
                            animate={{ y: [0, -3.5, 0], opacity: [0.35, 1, 0.35] }}
                            transition={{
                              duration: 0.85,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: 0.36,
                            }}
                            className="w-1.5 h-1.5 rounded-full bg-[#454f59]"
                          />
                        </div>
                        <span className="text-[11px] font-medium text-[#717a84] select-none">
                          Assistant is checking calendar...
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="px-3.5 py-2.5 bg-[#faf9f5] border-t border-[#eae5db] flex items-center gap-2 overflow-x-auto no-scrollbar">
                {DEFAULT_SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug)}
                    disabled={isLoading}
                    className="px-3 py-1.2 rounded-full bg-[#ffffff] hover:bg-[#f3efe8] hover:text-[#2d3139] hover:shadow-[0_2px_6px_rgba(45,49,57,0.06)] text-[#55606d] text-[11px] font-medium whitespace-nowrap border border-[#eae5db] shadow-[0_1px_3px_rgba(45,49,57,0.04)] transition-all shrink-0 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {/* Input Bar with Muted Accent Send Button */}
              <div className="p-3 sm:p-3.5 bg-[#faf9f5] border-t border-[#eae5db]">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    id="chat-input-field"
                    type="text"
                    placeholder="Ask about your events or Indian holidays..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#e2ded5] text-xs text-[#2d3139] placeholder:text-[#8c949e] shadow-[0_1px_3px_rgba(45,49,57,0.04)] focus:outline-hidden focus:ring-2 focus:ring-[#4a545e]/15 focus:border-[#4a545e] bg-[#ffffff] transition-all"
                  />
                  <button
                    id="chat-send-button"
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !inputValue.trim()}
                    className="p-2.5 rounded-xl bg-[#4a545e] hover:bg-[#3f4750] hover:shadow-[0_2px_6px_rgba(40,44,52,0.12)] disabled:opacity-40 text-[#f7f9fa] transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </>
  );
};

// Markdown renderer for bolding, bullet points, and spacing
function renderMessageWithMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lIdx) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const displayLine = isBullet ? trimmed.slice(2) : line;

    // Process bold text
    const parts = displayLine.split(/(\*\*.*?\*\*)/g);
    const renderedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-semibold text-[#2d3139]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={pIdx}>{part}</span>;
    });

    if (isBullet) {
      return (
        <div key={lIdx} className="flex items-start gap-2 my-1 pl-1">
          <span className="text-[#717a84] font-semibold leading-none mt-1 select-none">•</span>
          <div className="flex-1">{renderedParts}</div>
        </div>
      );
    }

    if (!trimmed) {
      return <div key={lIdx} className="h-1.5" />;
    }

    return (
      <React.Fragment key={lIdx}>
        <span>{renderedParts}</span>
        {lIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}
