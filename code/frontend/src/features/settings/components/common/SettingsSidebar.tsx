import { motion } from 'framer-motion'
import { settingsCategories, type SettingsCategory } from '../../config'

interface SettingsSidebarProps {
  activeCategory: string
  onCategoryChange: (categoryId: string) => void
}

export function SettingsSidebar({ activeCategory, onCategoryChange }: SettingsSidebarProps) {
  return (
    <div className="w-64 flex-shrink-0">
      <nav className="space-y-1">
        {settingsCategories.map((category) => (
          <SettingsCategoryItem
            key={category.id}
            category={category}
            isActive={activeCategory === category.id}
            onClick={() => onCategoryChange(category.id)}
          />
        ))}
      </nav>
    </div>
  )
}

interface SettingsCategoryItemProps {
  category: SettingsCategory
  isActive: boolean
  onClick: () => void
}

function SettingsCategoryItem({ category, isActive, onClick }: SettingsCategoryItemProps) {
  const Icon = category.icon

  return (
    <motion.button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-lg
        transition-colors relative
        ${isActive ? 'text-white' : 'text-white/60 hover:text-white/80'}
      `}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      {isActive && (
        <motion.div
          layoutId="activeCategory"
          className="absolute inset-0 bg-white/10 rounded-lg"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <Icon className="w-5 h-5 relative z-10" />
      <span className="font-medium relative z-10">{category.name}</span>
    </motion.button>
  )
}
