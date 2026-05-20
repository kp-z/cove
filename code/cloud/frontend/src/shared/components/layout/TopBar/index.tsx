import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenPill, type TokenUsageData } from './TokenPill';
import { TimeCapsule } from './TimeCapsule';
import { AgentRunCapsule } from './AgentRunCapsule';
import { NotificationBubble } from './NotificationBubble';
import { UserMenu } from './UserMenu';
import { DockCapsuleItem } from './DockCapsuleItem';
import { AnimatedBorder } from './AnimatedBorder';
import { useDockMagnification } from '@/shared/hooks/useDockMagnification';
import { useNotificationStore } from '@/core/stores/notificationStore';

export function TopBar() {
  const navigate = useNavigate();
  const { t } = useTranslation('layout');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [tokenUsage] = useState<TokenUsageData | undefined>(undefined);
  const [isTokenLoading] = useState(false);

  // Use global notification store
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearAll = useNotificationStore((state) => state.clearAll);

  const { mouseX, containerRef, handleMouseMove, handleMouseLeave } =
    useDockMagnification();

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

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
      className="relative z-30 hidden md:flex shrink-0 min-h-12 h-12 box-border items-center justify-between px-6 bg-white/[0.03] backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] overflow-visible"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none" />

      <div className="relative flex items-center gap-4 flex-1">
        {/* Navigation buttons */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
          className="hidden sm:flex items-center gap-1"
        >
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-white/5 text-gray-400 hover:text-white"
            title={t('topBar.back')}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-white/5 text-gray-400 hover:text-white"
            title={t('topBar.forward')}
          >
            <ChevronRight size={20} />
          </button>
        </motion.div>

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
                  placeholder={t('topBar.searchPlaceholder')}
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

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex items-center gap-4 overflow-visible"
      >
        <DockCapsuleItem mouseX={mouseX} index={0}>
          <AgentRunCapsule runningCount={0} />
        </DockCapsuleItem>

        <DockCapsuleItem mouseX={mouseX} index={1}>
          <NotificationBubble
            notifications={notifications}
            onDismiss={removeNotification}
            onClearAll={clearAll}
          />
        </DockCapsuleItem>

        <DockCapsuleItem mouseX={mouseX} index={2}>
          <TimeCapsule lang="en" />
        </DockCapsuleItem>

        <DockCapsuleItem mouseX={mouseX} index={3}>
          <TokenPill data={tokenUsage} isLoading={isTokenLoading} />
        </DockCapsuleItem>

        <DockCapsuleItem mouseX={mouseX} index={4}>
          <UserMenu />
        </DockCapsuleItem>
      </div>

      <AnimatedBorder />
    </motion.header>
  );
}
