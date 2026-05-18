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
  dateRange?: {
    start: Date;
    end: Date;
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

export function TimelineFilter({ onFilterChange }: TimelineFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);
  const [searchText, setSearchText] = useState('');

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
    onFilterChange({
      messageTypes: newTypes,
      searchText: searchText || undefined,
    });
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    onFilterChange({
      messageTypes: selectedTypes,
      searchText: text || undefined,
    });
  };

  const handleClearFilters = () => {
    setSelectedTypes(['all']);
    setSearchText('');
    onFilterChange({
      messageTypes: ['all'],
    });
  };

  const hasActiveFilters = selectedTypes.length > 1 || (selectedTypes[0] !== 'all') || searchText;

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
