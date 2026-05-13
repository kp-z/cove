import { motion } from 'framer-motion';

export function AnimatedBorder() {
  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-px"
      style={{
        background:
          'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.2) 25%, rgba(168,85,247,0.2) 50%, rgba(59,130,246,0.2) 75%, transparent 100%)',
        backgroundSize: '200% 100%',
      }}
      animate={{ backgroundPosition: ['0% 0%', '-200% 0%'] }}
      transition={{
        duration: 8,
        ease: 'linear',
        repeat: Infinity,
      }}
    />
  );
}
