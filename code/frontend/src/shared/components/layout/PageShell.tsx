import { cn } from '@/shared/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn('h-full flex flex-col overflow-hidden', className)}>
      {children}
    </div>
  );
}
