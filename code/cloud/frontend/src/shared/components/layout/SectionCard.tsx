import { GlassCard } from '@/shared/components/ui/cards/GlassCard';

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, description, icon, children, className }: SectionCardProps) {
  return (
    <GlassCard padding="p-4" className={className}>
      <div className="mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        )}
      </div>
      {children}
    </GlassCard>
  );
}
