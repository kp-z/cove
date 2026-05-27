import { useState, useMemo, ReactNode } from 'react';
import { WaterLevel } from './WaterLevel';

export interface BubbleItem {
  id: string;
  label: string;
  state: 'active' | 'available' | 'disabled';
  progress?: number;
  tooltip?: ReactNode;
}

export interface BubbleGroupProps {
  items: BubbleItem[];
  variant?: 'compact' | 'comfortable';
  onItemClick?: (id: string) => void;
  className?: string;
}

type BubblePos = { size: number; top: string; left: string };

const COMPACT_POSITIONS: BubblePos[] = [
  { size: 55, top: '8%', left: '75%' },
  { size: 52, top: '10%', left: '28%' },
  { size: 48, top: '50%', left: '12%' },
  { size: 45, top: '18%', left: '50%' },
  { size: 38, top: '58%', left: '60%' },
  { size: 35, top: '55%', left: '85%' },
  { size: 32, top: '65%', left: '35%' },
  { size: 28, top: '15%', left: '8%' },
];

const COMFORTABLE_POSITIONS: BubblePos[] = [
  ...COMPACT_POSITIONS.map(p => ({ ...p, size: Math.round(p.size * 1.22) })),
  { size: 50, top: '36%', left: '44%' },
  { size: 47, top: '24%', left: '68%' },
  { size: 44, top: '6%', left: '40%' },
  { size: 42, top: '70%', left: '22%' },
  { size: 40, top: '46%', left: '90%' },
  { size: 38, top: '14%', left: '52%' },
  { size: 36, top: '60%', left: '6%' },
  { size: 34, top: '28%', left: '16%' },
];

type LayoutKey = 'compact-mobile' | 'compact-desktop' | 'comfortable-mobile' | 'comfortable-desktop';

const LAYOUT: Record<
  LayoutKey,
  {
    container: string;
    positions: BubblePos[];
    maxBubbles: number;
    labelClass: string;
    scaleClass: string;
    tooltipComfortable: boolean;
  }
> = {
  'compact-mobile': {
    container: 'relative h-32 flex items-center justify-center',
    positions: COMPACT_POSITIONS,
    maxBubbles: 8,
    labelClass: 'text-[7px]',
    scaleClass: 'active:scale-110',
    tooltipComfortable: false,
  },
  'compact-desktop': {
    container: 'relative h-24 flex items-center justify-center',
    positions: COMPACT_POSITIONS,
    maxBubbles: 8,
    labelClass: 'text-[8px]',
    scaleClass: 'hover:scale-110',
    tooltipComfortable: true,
  },
  'comfortable-mobile': {
    container: 'relative h-40 flex items-center justify-center',
    positions: COMFORTABLE_POSITIONS,
    maxBubbles: 16,
    labelClass: 'text-[9px]',
    scaleClass: 'active:scale-110',
    tooltipComfortable: false,
  },
  'comfortable-desktop': {
    container: 'relative h-44 flex items-center justify-center',
    positions: COMFORTABLE_POSITIONS,
    maxBubbles: 16,
    labelClass: 'text-[10px]',
    scaleClass: 'hover:scale-110',
    tooltipComfortable: true,
  },
};

function BubbleGroupColumn({
  layoutKey,
  items,
  onItemClick,
  hoveredItem,
  setHoveredItem,
}: {
  layoutKey: LayoutKey;
  items: BubbleItem[];
  onItemClick?: (id: string) => void;
  hoveredItem: string | null;
  setHoveredItem: (v: string | null) => void;
}) {
  const cfg = LAYOUT[layoutKey];
  const pointerMode = layoutKey.endsWith('desktop');

  const bubbles = useMemo(() => {
    const cap = Math.min(cfg.maxBubbles, cfg.positions.length, items.length);
    return items.slice(0, cap).map((item, i) => ({ ...item, position: cfg.positions[i]!, index: i }));
  }, [items, cfg.maxBubbles, cfg.positions]);

  if (bubbles.length === 0) return null;

  const handleClick = (bubble: (typeof bubbles)[0]) => {
    if (bubble.state === 'available' && onItemClick) {
      onItemClick(bubble.id);
      return;
    }
    if (!pointerMode) {
      setHoveredItem(hoveredItem === bubble.id ? null : bubble.id);
    }
  };

  return (
    <div className={cfg.container}>
      {bubbles.map(bubble => {
        const { position, index, state, label, progress, tooltip, id } = bubble;
        const isActive = state === 'active';
        const isAvailable = state === 'available';
        const isDisabled = state === 'disabled';
        const hasProgress = progress !== undefined;

        return (
          <div
            key={id}
            className={`absolute group ${isAvailable ? 'cursor-pointer' : 'cursor-default'}`}
            style={{
              top: position.top,
              left: position.left,
              width: `${position.size}px`,
              height: `${position.size}px`,
              animation: `float ${3 + index * 0.5}s ease-in-out infinite`,
              animationDelay: `${index * 0.3}s`,
            }}
            title={label}
            onClick={() => handleClick(bubble)}
            {...(pointerMode
              ? {
                  onMouseEnter: () => setHoveredItem(id),
                  onMouseLeave: () => setHoveredItem(null),
                }
              : {})}
          >
            {isActive ? (
              <>
                <div
                  className={`w-full h-full rounded-full relative overflow-hidden transition-transform duration-300 border-2 bg-gradient-to-br from-white/8 via-white/4 to-transparent group ${cfg.scaleClass}`}
                  style={{
                    borderColor: 'rgba(59, 130, 246, 0.6)',
                    boxShadow:
                      layoutKey.includes('comfortable')
                        ? '0 0 28px rgba(59, 130, 246, 0.65), 0 0 52px rgba(59, 130, 246, 0.35), inset 0 0 35px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.4)'
                        : '0 0 25px rgba(59, 130, 246, 0.6), 0 0 50px rgba(59, 130, 246, 0.3), inset 0 0 35px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.4)',
                  }}
                >
                  <div
                    className={`absolute top-[18%] left-[28%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-white/50 via-white/20 to-transparent ${
                      cfg.tooltipComfortable ? 'blur-[3px]' : 'blur-[2px]'
                    }`}
                  />
                  {cfg.tooltipComfortable && (
                    <div className="absolute top-[12%] right-[22%] w-[18%] h-[18%] rounded-full bg-white/30 blur-[1px]" />
                  )}
                  {hasProgress && <WaterLevel percentage={progress} size={position.size} />}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
                    <span className={`${cfg.labelClass} font-bold text-white drop-shadow-lg text-center leading-tight px-1`}>
                      {label}
                    </span>
                  </div>
                </div>
                {hoveredItem === id && tooltip && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ zIndex: 30 }}
                  >
                    {tooltip}
                  </div>
                )}
              </>
            ) : isAvailable ? (
              <>
                <div
                  className={`w-full h-full rounded-full relative overflow-hidden transition-transform duration-300 border-2 bg-gradient-to-br from-white/8 via-white/4 to-transparent group ${cfg.scaleClass}`}
                  style={{
                    borderColor: 'rgba(34, 197, 94, 0.4)',
                    boxShadow:
                      layoutKey.includes('comfortable')
                        ? '0 0 22px rgba(34, 197, 94, 0.45), 0 0 42px rgba(34, 197, 94, 0.22), inset 0 0 28px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255,255,255,0.4)'
                        : '0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2), inset 0 0 30px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255,255,255,0.4)',
                  }}
                >
                  <div
                    className={`absolute top-[18%] left-[28%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-white/50 via-white/20 to-transparent ${
                      cfg.tooltipComfortable ? 'blur-[3px]' : 'blur-[2px]'
                    }`}
                  />
                  {cfg.tooltipComfortable && (
                    <div className="absolute top-[12%] right-[22%] w-[18%] h-[18%] rounded-full bg-white/30 blur-[1px]" />
                  )}
                  {hasProgress && <WaterLevel percentage={progress} size={position.size} />}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
                    <span className={`${cfg.labelClass} font-bold text-white drop-shadow-lg text-center leading-tight px-1`}>
                      {label}
                    </span>
                  </div>
                </div>
                {hoveredItem === id && tooltip && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ zIndex: 30 }}
                  >
                    {tooltip}
                  </div>
                )}
              </>
            ) : (
              <>
                <div
                  className={`w-full h-full rounded-full relative transition-transform duration-300 border bg-gradient-to-br from-white/8 via-white/4 to-transparent border-white/15 ${
                    cfg.tooltipComfortable ? 'hover:scale-110 shadow-[0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)]' : 'active:scale-110'
                  }`}
                >
                  <div
                    className={`absolute top-[18%] left-[28%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-white/50 via-white/20 to-transparent ${
                      cfg.tooltipComfortable ? 'blur-[3px]' : 'blur-[2px]'
                    }`}
                  />
                  {cfg.tooltipComfortable && (
                    <div className="absolute top-[12%] right-[22%] w-[18%] h-[18%] rounded-full bg-white/30 blur-[1px]" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`${cfg.labelClass} font-medium text-center leading-tight px-1 text-gray-400`}>
                      {label}
                    </span>
                  </div>
                </div>
                {hoveredItem === id && tooltip && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ zIndex: 30 }}
                  >
                    {tooltip}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BubbleGroup({ items, variant = 'compact', onItemClick, className }: BubbleGroupProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  if (!items?.length) return null;

  const mobileKey = `${variant}-mobile` as LayoutKey;
  const desktopKey = `${variant}-desktop` as LayoutKey;

  return (
    <div className={className}>
      <div className="block md:hidden">
        <BubbleGroupColumn
          layoutKey={mobileKey}
          items={items}
          onItemClick={onItemClick}
          hoveredItem={hoveredItem}
          setHoveredItem={setHoveredItem}
        />
      </div>
      <div className="hidden md:block">
        <BubbleGroupColumn
          layoutKey={desktopKey}
          items={items}
          onItemClick={onItemClick}
          hoveredItem={hoveredItem}
          setHoveredItem={setHoveredItem}
        />
      </div>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-8px) translateX(3px); }
          50% { transform: translateY(-4px) translateX(-3px); }
          75% { transform: translateY(-10px) translateX(2px); }
        }
      `}</style>
    </div>
  );
}
