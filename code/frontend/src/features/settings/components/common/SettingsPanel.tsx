import { motion, AnimatePresence } from 'framer-motion'
import { GeneralPanel } from '../panels/GeneralPanel'
import { AppearancePanel } from '../panels/AppearancePanel'
import { NotificationsPanel } from '../panels/NotificationsPanel'
import { AccountPanel } from '../panels/AccountPanel'
import { SecurityPanel } from '../panels/SecurityPanel'

interface SettingsPanelProps {
  activeCategory: string
}

export function SettingsPanel({ activeCategory }: SettingsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeCategory === 'general' && <GeneralPanel />}
          {activeCategory === 'appearance' && <AppearancePanel />}
          {activeCategory === 'notifications' && <NotificationsPanel />}
          {activeCategory === 'account' && <AccountPanel />}
          {activeCategory === 'security' && <SecurityPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
