import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface CardGridItem {
  id: string;
  colSpan?: {
    default?: number;
    md?: number;
    lg?: number;
  };
  content: ReactNode;
  animation?: {
    delay?: number;
    initial?: Record<string, unknown>;
    animate?: Record<string, unknown>;
  };
}

interface CardGridRow {
  id: string;
  cols: number; // 该行的总列数
  gap?: number; // 间距（默认 6）
  items: CardGridItem[];
}

interface CardGridLayoutProps {
  rows: CardGridRow[];
  className?: string;
}

export function CardGridLayout({ rows, className }: CardGridLayoutProps) {
  return (
    <div className={cn('space-y-8', className)}>
      {rows.map((row) => (
        <div
          key={row.id}
          className={cn(
            'grid grid-cols-1 items-stretch',
            row.cols === 2 && 'md:grid-cols-2',
            row.cols === 3 && 'lg:grid-cols-3',
            row.cols === 4 && 'md:grid-cols-2 lg:grid-cols-4',
            row.gap === 4 && 'gap-4',
            row.gap === 6 && 'gap-6',
            row.gap === 8 && 'gap-8',
            !row.gap && 'gap-6'
          )}
        >
          {row.items.map((item) => {
            const colSpanClasses = item.colSpan
              ? cn(
                  // default breakpoint
                  item.colSpan.default === 1 && 'col-span-1',
                  item.colSpan.default === 2 && 'col-span-2',
                  item.colSpan.default === 3 && 'col-span-3',
                  item.colSpan.default === 4 && 'col-span-4',
                  // md breakpoint
                  item.colSpan.md === 1 && 'md:col-span-1',
                  item.colSpan.md === 2 && 'md:col-span-2',
                  item.colSpan.md === 3 && 'md:col-span-3',
                  item.colSpan.md === 4 && 'md:col-span-4',
                  // lg breakpoint
                  item.colSpan.lg === 1 && 'lg:col-span-1',
                  item.colSpan.lg === 2 && 'lg:col-span-2',
                  item.colSpan.lg === 3 && 'lg:col-span-3',
                  item.colSpan.lg === 4 && 'lg:col-span-4'
                )
              : '';

            return (
              <motion.div
                key={item.id}
                className={cn('flex', colSpanClasses)}
                initial={item.animation?.initial || { opacity: 0, y: 20 }}
                animate={item.animation?.animate || { opacity: 1, y: 0 }}
                transition={{ delay: item.animation?.delay || 0 }}
              >
                <div className="flex-1 flex flex-col">{item.content}</div>
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
