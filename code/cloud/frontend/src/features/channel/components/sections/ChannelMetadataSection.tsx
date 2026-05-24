import { Tag } from 'lucide-react';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { FormField } from '@/shared/components/form/FormField';
import { Input } from '@/shared/components/ui/input';
import { TagInput } from '@/shared/components/form';

interface ChannelMetadataSectionProps {
  tags?: string[];
  category?: string;
  onTagsChange: (tags: string[]) => void;
  onCategoryChange: (category: string) => void;
}

export function ChannelMetadataSection({
  tags = [],
  category,
  onTagsChange,
  onCategoryChange,
}: ChannelMetadataSectionProps) {
  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      onTagsChange([...tags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(tags.filter(t => t !== tag));
  };

  return (
    <SectionCard
      title="Metadata"
      description="Tags and categorization"
      icon={<Tag className="w-4 h-4" />}
    >
      <div className="space-y-4">
        <FormField label="Tags" description="Searchable tags">
          <TagInput
            tags={tags}
            onAdd={handleAddTag}
            onRemove={handleRemoveTag}
            placeholder="Add tag"
          />
        </FormField>

        <FormField label="Category" description="Channel category">
          <Input
            value={category || ''}
            onChange={(e) => onCategoryChange(e.target.value)}
            placeholder="e.g., Engineering, Design, General"
          />
        </FormField>
      </div>
    </SectionCard>
  );
}
