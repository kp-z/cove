/**
 * DeviceStartCommandPanel - Device 启动命令面板
 *
 * 显示启动命令和 API Key，支持复制，轮询 Device 状态
 */

import { useState } from 'react';
import { AlertCircle, X, Copy, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface DeviceStartCommandPanelProps {
  realmId: string;
  onDeviceOnline: () => void;
  onClose: () => void;
}

export function DeviceStartCommandPanel({
  realmId,
  onDeviceOnline,
  onClose,
}: DeviceStartCommandPanelProps) {
  const { data: deviceStatus } = trpc.realm.getDeviceStatus.useQuery(
    { realmId },
    {
      refetchInterval: 3000, // 每 3 秒检查一次
      onSuccess: (data) => {
        if (data.isOnline) {
          onDeviceOnline();
        }
      },
    }
  );

  const [copied, setCopied] = useState<'command' | 'key' | null>(null);

  const copyToClipboard = (text: string, type: 'command' | 'key') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!deviceStatus || !deviceStatus.startCommand) {
    return null;
  }

  return (
    <div className="mt-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <h4 className="font-semibold text-yellow-100">Device Offline</h4>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-sm text-yellow-200/80 mb-4">
        Start your local device to access this realm:
      </p>

      {/* 启动命令 */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-white/80 mb-1">
          Command:
        </label>
        <div className="flex gap-2">
          <code className="flex-1 p-2 bg-black/30 border border-white/10 rounded text-xs overflow-x-auto font-mono text-white/90">
            {deviceStatus.startCommand}
          </code>
          <button
            onClick={() => copyToClipboard(deviceStatus.startCommand!, 'command')}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm flex items-center gap-1 flex-shrink-0"
          >
            {copied === 'command' ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* API Key */}
      {deviceStatus.apiKey && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-white/80 mb-1">
            API Key:
          </label>
          <div className="flex gap-2">
            <code className="flex-1 p-2 bg-black/30 border border-white/10 rounded text-xs overflow-x-auto font-mono text-white/90">
              {deviceStatus.apiKey}
            </code>
            <button
              onClick={() => copyToClipboard(deviceStatus.apiKey!, 'key')}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm flex items-center gap-1 flex-shrink-0"
            >
              {copied === 'key' ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          {deviceStatus.warning && (
            <p className="text-xs text-red-400 mt-1">
              {deviceStatus.warning}
            </p>
          )}
        </div>
      )}

      {/* 状态指示 */}
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-white/60">Waiting for device to come online...</span>
      </div>
    </div>
  );
}
