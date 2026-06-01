/**
 * CreateRealmForm - 内联 Realm 创建表单
 *
 * 在 RealmSelector 中展开，不跳转页面
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import type { RealmInfo } from './RealmCard';

interface CreateRealmFormProps {
  onSuccess: (realm: RealmInfo) => void;
  onCancel: () => void;
}

export function CreateRealmForm({ onSuccess, onCancel }: CreateRealmFormProps) {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');

  const utils = trpc.useUtils();
  const createMutation = trpc.realm.createWithDevice.useMutation({
    onSuccess: (data) => {
      // Invalidate realm list to refresh
      utils.realm.list.invalidate();

      // Call success callback with new realm info
      onSuccess({
        realmId: data.realm.realm_id,
        name: data.realm.name,
        displayName: data.realm.display_name,
        logoUrl: data.realm.logo_url,
        status: data.realm.status,
        deviceStatus: 'offline', // 新创建的 Device 默认离线
        isDefault: false,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      displayName,
      description,
      ownerId: '', // Will be set by backend from ctx.userId
      visibility: 'private',
    });
  };

  return (
    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">Create New Realm</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">
            Realm Name (internal)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-realm"
            pattern="[a-z0-9-]+"
            required
            className="w-full px-3 py-2 border border-white/10 rounded bg-black/30 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-white/50 mt-1">
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="My Realm"
            required
            className="w-full px-3 py-2 border border-white/10 rounded bg-black/30 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this realm for?"
            rows={3}
            className="w-full px-3 py-2 border border-white/10 rounded bg-black/30 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isLoading}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isLoading ? 'Creating...' : 'Create Realm'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={createMutation.isLoading}
            className="px-4 py-2 border border-white/20 rounded hover:bg-white/5 transition-colors text-white"
          >
            Cancel
          </button>
        </div>

        {createMutation.error && (
          <p className="text-sm text-red-400">
            {createMutation.error.message}
          </p>
        )}
      </form>
    </div>
  );
}
