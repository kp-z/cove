import { motion, AnimatePresence } from 'framer-motion'
import { AccountPanel } from '../panels/AccountPanel'
import { SecurityPanel } from '../panels/SecurityPanel'
import { GeneralPanel } from '../panels/GeneralPanel'
import { AppearancePanel } from '../panels/AppearancePanel'
import { NotificationsPanel } from '../panels/NotificationsPanel'
import { RealmPanel } from '../panels/RealmPanel'
import { AdaptersPanel } from '../panels/AdaptersPanel'

interface SettingsPanelProps {
  activeCategory: string
}

export function SettingsPanel({ activeCategory }: SettingsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto pr-2 relative z-10">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="pb-8"
        >
          {activeCategory === 'account' && <AccountPanel />}
          {activeCategory === 'security' && <SecurityPanel />}
          {activeCategory === 'general' && <GeneralPanel />}
          {activeCategory === 'appearance' && <AppearancePanel />}
          {activeCategory === 'notifications' && <NotificationsPanel />}
          {activeCategory === 'realm' && <RealmPanel />}
          {activeCategory === 'adapters' && <AdaptersPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
