import { useState, type KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';

interface TagInputProps {
  label: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
  variant?: 'default' | 'secondary' | 'outline';
  className?: string;
}

export function TagInput({ 
  label, 
  tags, 
  onAdd, 
  onRemove, 
  placeholder = 'Press Enter to add', 
  variant = 'secondary', 
  className 
}: TagInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onAdd(input.trim());
      }
      setInput('');
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px]">
        {tags.map(tag => (
          <Badge key={tag} variant={variant} className={`gap-1 ${className || ''}`}>
            {tag}
            <button
              onClick={() => onRemove(tag)}
              className="hover:text-foreground transition-colors"
              type="button"
            >
              <X size={12} />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}
