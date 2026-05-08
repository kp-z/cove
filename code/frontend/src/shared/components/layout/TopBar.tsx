import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function TopBar() {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    <header className="relative z-30 hidden md:flex h-12 items-center justify-between px-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-visible">
      <div className="flex items-center gap-4 flex-1">
        {/* Navigation buttons */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-white/5 text-gray-400 hover:text-white"
            title="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-white/5 text-gray-400 hover:text-white"
            title="Forward"
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
                  placeholder="Search..."
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
        {/* Notifications */}
        <button className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-white/5">
          <Bell size={18} />
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-400/50 transition-all">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  );
}
