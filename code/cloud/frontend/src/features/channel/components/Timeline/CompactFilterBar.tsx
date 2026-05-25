/**
 * CompactFilterBar - 紧凑型筛选栏
 *
 * 将常用筛选器平铺展示，搜索框可折叠
 */

import { useState } from 'react';
import { Search, MessageSquare, Image as ImageIcon, File, MessageCircle, AlertCircle } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';

export interface CompactFilterBarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  selectedTypes: string[];
  onTypeToggle: (type: string) => void;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

const MESSAGE_TYPES = [
  { value: 'all', label: 'All', icon: MessageSquare },
  { value: 'text', label: 'Text', icon: MessageSquare },
  { value: 'image', label: 'Image', icon: ImageIcon },
  { value: 'file', label: 'File', icon: File },
  { value: 'thread', label: 'Thread', icon: MessageCircle },
  { value: 'system', label: 'System', icon: AlertCircle },
];

export function CompactFilterBar({
  searchText,
  onSearchChange,
  selectedTypes,
  onTypeToggle,
}: CompactFilterBarProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <div className="space-y-3 mb-6">
      {/* Type Filter Chips - Always Visible */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Toggle Button */}
        <button
          onClick={() => setIsSearchExpanded(!isSearchExpanded)}
          className={`
            h-8 w-8 rounded-md transition-all flex items-center justify-center shrink-0
            ${isSearchExpanded
              ? 'bg-primary text-primary-foreground'
              : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
            }
          `}
          title="Toggle search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Type Filter Chips */}
        {MESSAGE_TYPES.map((type) => {
          const isSelected = selectedTypes.includes(type.value);
          const Icon = type.icon;

          return (
            <button
              key={type.value}
              onClick={() => onTypeToggle(type.value)}
              className={`
                h-8 px-3 rounded-md transition-all flex items-center gap-2
                ${isSelected
                  ? 'bg-primary text-primary-foreground border border-primary'
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{type.label}</span>
            </button>
          );
        })}
      </div>

      {/* Expandable Search Input */}
      {isSearchExpanded && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
