/**
 * CompactFilterBar - 紧凑型筛选栏
 *
 * 将常用筛选器平铺展示，无需展开面板
 */

import { useState } from 'react';
import { Search, Settings } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
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
  { value: 'all', label: 'All', icon: '📋' },
  { value: 'text', label: 'Text', icon: '💬' },
  { value: 'image', label: 'Image', icon: '🖼️' },
  { value: 'file', label: 'File', icon: '📎' },
  { value: 'thread', label: 'Thread', icon: '🧵' },
  { value: 'system', label: 'System', icon: '⚙️' },
];

const TIME_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Today' },
  { value: '7d', label: 'This Week' },
  { value: '30d', label: 'This Month' },
];

export function CompactFilterBar({
  searchText,
  onSearchChange,
  selectedTypes,
  onTypeToggle,
  timeRange,
  onTimeRangeChange,
}: CompactFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-3 mb-6">
      {/* Main Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Time Range Selector */}
        <select
          value={timeRange}
          onChange={(e) => onTimeRangeChange(e.target.value)}
          className="h-9 px-3 rounded-md border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {TIME_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>

        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5">
          {MESSAGE_TYPES.map((type) => {
            const isSelected = selectedTypes.includes(type.value);
            const isAll = type.value === 'all';

            return (
              <button
                key={type.value}
                onClick={() => onTypeToggle(type.value)}
                className={`
                  h-9 px-3 rounded-md text-sm font-medium transition-all
                  flex items-center gap-1.5
                  ${isSelected
                    ? 'bg-primary text-primary-foreground border border-primary'
                    : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
                  }
                  ${isAll ? 'min-w-[70px]' : ''}
                `}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Advanced Settings */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="h-9 w-9 p-0"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Advanced Settings Panel */}
      {showAdvanced && (
        <div className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3">
          <div className="text-sm font-medium text-white">Advanced Filters</div>
          <div className="text-xs text-white/60">
            Additional filtering options coming soon...
          </div>
        </div>
      )}
    </div>
  );
}
