import { Plus, Star } from 'lucide-react';
import type { RealmAdapter } from './types';

interface RealmAdaptersCardProps {
  adapters: RealmAdapter[];
  canManage: boolean;
  onAddAdapter: () => void;
  onSetDefault: (adapterId: string) => void;
}

const PROVIDER_COLOR: Record<string, string> = {
  anthropic: 'text-purple-400',
  openai: 'text-green-400',
  ollama: 'text-blue-400',
};

export function RealmAdaptersCard({ adapters, canManage, onAddAdapter, onSetDefault }: RealmAdaptersCardProps) {
  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Adapters</h3>
        {canManage && (
          <button
            onClick={onAddAdapter}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Add Adapter"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {adapters.length === 0 ? (
        <div className="text-center py-8 text-white/60">No adapters configured</div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {adapters.map((adapter) => (
            <div
              key={adapter.adapterId}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-sm font-medium text-white truncate">
                    {adapter.name}
                  </div>
                  {adapter.isDefault && (
                    <Star size={12} className="text-yellow-400 fill-yellow-400 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-white/50 truncate">
                  <span className={PROVIDER_COLOR[adapter.provider] || 'text-white/50'}>
                    {adapter.provider}
                  </span>
                  {' • '}
                  {adapter.model}
                </div>
              </div>
              {canManage && !adapter.isDefault && (
                <button
                  onClick={() => onSetDefault(adapter.adapterId)}
                  className="shrink-0 p-1.5 rounded text-white/40 hover:text-yellow-400 hover:bg-white/[0.05] transition-colors"
                  title="Set as default"
                >
                  <Star size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
