import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Realm } from '@/lib/trpc-types';
import type { RealmUpdateData } from './types';

interface RealmEditDialogProps {
  realm?: Realm;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RealmUpdateData) => void;
  isLoading: boolean;
}

export function RealmEditDialog({ realm, isOpen, onClose, onSave, isLoading }: RealmEditDialogProps) {
  const [formData, setFormData] = useState<RealmUpdateData>({
    displayName: '',
    description: '',
    visibility: 'private',
  });

  useEffect(() => {
    if (realm) {
      setFormData({
        displayName: realm.display_name,
        description: realm.description || '',
        visibility: realm.visibility,
      });
    } else {
      setFormData({
        displayName: '',
        description: '',
        visibility: 'private',
      });
    }
  }, [realm, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <h2 className="text-xl font-semibold text-white">
            {realm ? 'Edit Realm' : 'Create Realm'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Display Name *
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50"
              placeholder="My Workspace"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 resize-none"
              placeholder="A brief description of this realm"
              rows={3}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Visibility
            </label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'public' | 'private' })}
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white/80 bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : realm ? 'Save Changes' : 'Create Realm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
