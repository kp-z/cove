import { motion } from 'framer-motion'
import { cn } from '@/shared/lib/utils'

interface AdvancedLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

const sizeConfig = {
  sm: { container: 'w-8 h-8', dot: 'w-2 h-2' },
  md: { container: 'w-12 h-12', dot: 'w-3 h-3' },
  lg: { container: 'w-16 h-16', dot: 'w-4 h-4' },
}

export function AdvancedLoader({ size = 'md', message }: AdvancedLoaderProps) {
  const config = sizeConfig[size]

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={cn('relative', config.container)}>
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={cn('absolute rounded-full bg-primary', config.dot)}
            style={{
              left: '50%',
              top: '50%',
              x: '-50%',
              y: '-50%',
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground"
        >
          {message}
        </motion.p>
      )}
    </div>
  )
}
