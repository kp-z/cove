/**
 * CompactFilterBar - 紧凑型筛选栏
 *
 * 将常用筛选器平铺展示，无需展开面板
 */

import { useState } from 'react';
import { Search, Settings, MessageSquare, Image as ImageIcon, File, MessageCircle, AlertCircle } from 'lucide-react';
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
  { value: 'all', label: 'All', icon: MessageSquare },
  { value: 'text', label: 'Text', icon: MessageSquare },
  { value: 'image', label: 'Image', icon: ImageIcon },
  { value: 'file', label: 'File', icon: File },
  { value: 'thread', label: 'Thread', icon: MessageCircle },
  { value: 'system', label: 'System', icon: AlertCircle },
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
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-3 mb-6">
      {/* Main Filter Bar */}
      <div className="flex items-center gap-2">
        {/* Filter Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Search size={16} />
          Filter
          {(selectedTypes.length > 1 || selectedTypes[0] !== 'all' || timeRange !== 'all') && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {selectedTypes.filter(t => t !== 'all').length || 1}
            </span>
          )}
        </Button>
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-4">
          {/* Search Input */}
          <div>
            <label className="text-sm font-medium mb-2 block text-white">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search messages..."
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          {/* Time Range Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block text-white">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => onTimeRangeChange(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TIME_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter Chips */}
          <div>
            <label className="text-sm font-medium mb-2 block text-white">Message Type</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {MESSAGE_TYPES.map((type) => {
                const isSelected = selectedTypes.includes(type.value);
                const Icon = type.icon;

                return (
                  <button
                    key={type.value}
                    onClick={() => onTypeToggle(type.value)}
                    className={`
                      h-9 px-3 rounded-md transition-all
                      flex items-center gap-2
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
          </div>
        </div>
      )}
    </div>
  );
}
