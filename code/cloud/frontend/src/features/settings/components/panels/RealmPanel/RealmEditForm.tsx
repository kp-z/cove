import { useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { FormField } from '@/shared/components/form';
import type { Realm } from '@/lib/trpc-types';

interface RealmEditFormProps {
  realm: Realm;
  onSave: (data: RealmUpdateData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface RealmUpdateData {
  display_name?: string;
  description?: string;
  visibility?: 'public' | 'private';
}

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'public', label: 'Public' },
] as const;

export function RealmEditForm({ realm, onSave, onCancel, isLoading }: RealmEditFormProps) {
  const [displayName, setDisplayName] = useState(realm.display_name || '');
  const [description, setDescription] = useState(realm.description || '');
  const [visibility, setVisibility] = useState<'public' | 'private'>(realm.visibility || 'private');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      display_name: displayName,
      description,
      visibility,
    });
  };

  const hasChanges =
    displayName !== (realm.display_name || '') ||
    description !== (realm.description || '') ||
    visibility !== (realm.visibility || 'private');

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white/[0.02] border border-white/[0.08] rounded-xl">
      <h3 className="text-lg font-semibold text-white mb-4">Edit Realm</h3>

      <FormField label="Display Name">
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="My Workspace"
          required
        />
      </FormField>

      <FormField label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A collaborative workspace for team projects"
          rows={3}
        />
      </FormField>

      <FormField label="Visibility">
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !hasChanges}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
