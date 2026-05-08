import { User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserSectionProps {
  collapsed: boolean;
}

export function UserSection({ collapsed }: UserSectionProps) {
  return (
    <div className="p-3 border-t border-white/10">
      <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
          <User className="w-5 h-5" />
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex-1 min-w-0 overflow-hidden"
            >
              <p className="text-sm font-medium truncate">User</p>
              <p className="text-xs text-[#6b7280] truncate">user@cove.ai</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
