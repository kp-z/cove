import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/shared/components/ui/cards/GlassCard';
import { cn } from '@/shared/lib/utils';

interface CollapsibleSectionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  badge?: React.ReactNode;
  preview?: React.ReactNode; // Preview content shown when collapsed
}

export function CollapsibleSectionCard({
  title,
  icon,
  children,
  className,
  defaultExpanded = true,
  badge,
  preview,
}: CollapsibleSectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <GlassCard className={cn('overflow-visible', className)}>
      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors",
          !isExpanded && !preview && "pb-4" // No extra padding if collapsed without preview
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold">{title}</h3>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown size={20} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={20} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Preview - Shown when collapsed */}
      {!isExpanded && preview && (
        <div className="px-4 pb-4 text-sm text-muted-foreground">
          {preview}
        </div>
      )}

      {/* Content - Collapsible */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="pt-3 border-t border-border/30">
            {children}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
