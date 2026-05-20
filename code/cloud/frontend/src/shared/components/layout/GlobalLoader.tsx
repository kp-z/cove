import { motion } from 'framer-motion'
import { AdvancedLoader } from '@/shared/components/ui/loaders'

interface GlobalLoaderProps {
  message?: string
  progress?: number
  showProgress?: boolean
}

export function GlobalLoader({ message, progress, showProgress }: GlobalLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f111a]"
    >
      {/* Logo with pulse animation */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="mb-8"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
          <span className="text-3xl font-bold text-white">C</span>
        </div>
      </motion.div>

      {/* Advanced Loader */}
      <AdvancedLoader size="lg" message={message} />

      {/* Progress Bar */}
      {showProgress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 w-64"
        >
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {progress}%
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
