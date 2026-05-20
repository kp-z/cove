import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Icon size={48} className="text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground/70 mb-6">{description}</p>}
      {action}
    </div>
  );
}
