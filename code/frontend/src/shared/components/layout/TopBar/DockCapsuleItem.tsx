import { useRef } from 'react';
import { motion, type MotionValue } from 'framer-motion';
import { useItemScale } from '@/shared/hooks/useDockMagnification';

interface DockCapsuleItemProps {
  children: React.ReactNode;
  mouseX: MotionValue<number>;
  index: number;
}

export function DockCapsuleItem({ children, mouseX, index }: DockCapsuleItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const { scale, y } = useItemScale(mouseX, itemRef);

  return (
    <motion.div
      ref={itemRef}
      style={{ scale, y }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.3,
        delay: 0.15 + index * 0.05,
      }}
      className="origin-center"
    >
      {children}
    </motion.div>
  );
}
