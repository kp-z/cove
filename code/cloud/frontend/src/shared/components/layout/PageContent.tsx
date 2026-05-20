import { cn } from '@/shared/lib/utils';

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}

export function PageContent({ children, className, padded = true }: PageContentProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto', padded && 'px-6 pt-4 pb-6', className)}>
      {children}
    </div>
  );
}
