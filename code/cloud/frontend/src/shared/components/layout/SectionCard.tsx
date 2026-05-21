import { GlassCard } from '@/shared/components/ui/cards/GlassCard';

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, icon, children, className }: SectionCardProps) {
  return (
    <GlassCard className={`p-6 ${className || ''}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </GlassCard>
  );
}
