import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenPill, type TokenUsageData } from './TokenPill';
import { TimeCapsule } from './TimeCapsule';
import { AgentRunCapsule } from './AgentRunCapsule';
import { NotificationBubble, type Notification } from './NotificationBubble';
import { UserMenu } from './UserMenu';

export function TopBar() {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mock data - 未来替换为真实数据
  const [tokenUsage] = useState<TokenUsageData | undefined>(undefined);
  const [isTokenLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isSearchOpen &&
        searchInputRef.current &&
        !searchInputRef.current.parentElement?.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <header className="relative z-30 hidden md:flex shrink-0 min-h-12 h-12 box-border items-center justify-between px-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-visible">
      <div className="flex items-center gap-4 flex-1">
        {/* Navigation buttons */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-white/5 text-gray-400 hover:text-white"
            title="后退"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-white/5 text-gray-400 hover:text-white"
            title="前进"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Search box */}
        <div className="relative hidden sm:flex items-center">
          <motion.div
            initial={false}
            animate={{ width: isSearchOpen ? 320 : 42 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={`
              relative flex items-center overflow-hidden rounded-xl
              ${isSearchOpen ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5'}
            `}
          >
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`
                flex-shrink-0 p-2 transition-colors
                ${isSearchOpen ? 'text-gray-400' : 'text-gray-400 hover:text-white'}
              `}
            >
              <Search size={18} />
            </button>

            <AnimatePresence>
              {isSearchOpen && (
                <motion.input
                  ref={searchInputRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  type="text"
                  placeholder="搜索..."
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsSearchOpen(false);
                    }
                  }}
                  className="flex-1 bg-transparent py-2 pr-4 focus:outline-none text-sm"
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <div className="flex items-center gap-4 overflow-visible">
        {/* Agent Run Capsule */}
        <AgentRunCapsule runningCount={0} />

        {/* Notification Bubble */}
        <NotificationBubble
          notifications={notifications}
          onDismiss={handleDismissNotification}
          onClearAll={handleClearAllNotifications}
        />

        {/* Time Capsule */}
        <TimeCapsule lang="zh" />

        {/* Token Pill */}
        <TokenPill data={tokenUsage} isLoading={isTokenLoading} />

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
