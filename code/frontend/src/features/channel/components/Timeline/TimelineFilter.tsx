/**
 * TimelineFilter - 时间轴筛选组件
 *
 * 支持按消息类型、日期范围等条件筛选时间轴内容
 */

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export interface TimelineFilterOptions {
  messageTypes: string[];
  timeRange: {
    type: 'all' | '24h' | '7d' | '30d' | 'custom';
    startDate?: Date;
    endDate?: Date;
  };
  searchText?: string;
}

export interface TimelineFilterProps {
  onFilterChange: (filters: TimelineFilterOptions) => void;
}

const MESSAGE_TYPES = [
  { value: 'all', label: 'All Messages' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Images' },
  { value: 'file', label: 'Files' },
  { value: 'system', label: 'System' },
];

const TIME_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom Range' },
] as const;

export function TimelineFilter({ onFilterChange }: TimelineFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);
  const [searchText, setSearchText] = useState('');
  const [timeRange, setTimeRange] = useState<'all' | '24h' | '7d' | '30d' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const handleTypeToggle = (type: string) => {
    let newTypes: string[];

    if (type === 'all') {
      newTypes = ['all'];
    } else {
      newTypes = selectedTypes.filter(t => t !== 'all');
      if (newTypes.includes(type)) {
        newTypes = newTypes.filter(t => t !== type);
      } else {
        newTypes.push(type);
      }

      if (newTypes.length === 0) {
        newTypes = ['all'];
      }
    }

    setSelectedTypes(newTypes);
    emitFilterChange(newTypes, searchText, timeRange, customStartDate, customEndDate);
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    emitFilterChange(selectedTypes, text, timeRange, customStartDate, customEndDate);
  };

  const handleTimeRangeChange = (range: 'all' | '24h' | '7d' | '30d' | 'custom') => {
    setTimeRange(range);
    emitFilterChange(selectedTypes, searchText, range, customStartDate, customEndDate);
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    if (timeRange === 'custom') {
      emitFilterChange(selectedTypes, searchText, 'custom', start, end);
    }
  };

  const emitFilterChange = (
    types: string[],
    search: string,
    range: 'all' | '24h' | '7d' | '30d' | 'custom',
    startDate: string,
    endDate: string
  ) => {
    onFilterChange({
      messageTypes: types,
      searchText: search || undefined,
      timeRange: {
        type: range,
        startDate: range === 'custom' && startDate ? new Date(startDate) : undefined,
        endDate: range === 'custom' && endDate ? new Date(endDate) : undefined,
      },
    });
  };

  const handleClearFilters = () => {
    setSelectedTypes(['all']);
    setSearchText('');
    setTimeRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    onFilterChange({
      messageTypes: ['all'],
      timeRange: { type: 'all' },
    });
  };

  const hasActiveFilters =
    selectedTypes.length > 1 ||
    (selectedTypes[0] !== 'all') ||
    searchText ||
    timeRange !== 'all';

  return (
    <div className="mb-4 space-y-3">
      {/* Filter Toggle Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2"
        >
          <Filter size={16} />
          Filter
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {selectedTypes.filter(t => t !== 'all').length || 1}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X size={14} />
            Clear
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <div className="p-4 border rounded-lg bg-card space-y-4">
          {/* Time Range Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Time Range</label>
            <div className="flex flex-wrap gap-2">
              {TIME_RANGES.map((range) => {
                const isSelected = timeRange === range.value;
                return (
                  <button
                    key={range.value}
                    onClick={() => handleTimeRangeChange(range.value)}
                    className={`
                      px-3 py-1.5 text-sm rounded-md border transition-colors
                      ${isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent border-border'
                      }
                    `}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Range */}
            {timeRange === 'custom' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => handleCustomDateChange(e.target.value, customEndDate)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => handleCustomDateChange(customStartDate, e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search messages..."
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Message Types */}
          <div>
            <label className="text-sm font-medium mb-2 block">Message Type</label>
            <div className="flex flex-wrap gap-2">
              {MESSAGE_TYPES.map((type) => {
                const isSelected = selectedTypes.includes(type.value);
                return (
                  <button
                    key={type.value}
                    onClick={() => handleTypeToggle(type.value)}
                    className={`
                      px-3 py-1.5 text-sm rounded-md border transition-colors
                      ${isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent border-border'
                      }
                    `}
                  >
                    {type.label}
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
