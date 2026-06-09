/**
 * DeviceStartCommandPanel - Device 启动命令面板
 *
 * 显示启动命令和 API Key，支持复制，轮询 Device 状态
 * 只有 realm owner 可以生成和查看启动命令
 */

import { useState } from 'react';
import { AlertCircle, X, Copy, Check, RefreshCw, Key } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useCurrentUser } from '@/core/auth/useCurrentUser';

interface DeviceStartCommandPanelProps {
  realmId: string;
  realmOwnerId: string;
  onDeviceOnline: () => void;
  onClose: () => void;
}

export function DeviceStartCommandPanel({
  realmId,
  realmOwnerId,
  onDeviceOnline,
  onClose,
}: DeviceStartCommandPanelProps) {
  const { user } = useCurrentUser();
  const isSuperAdmin = user?.username === 'kp'; // kp 是超级管理员
  const isOwner = user?.id === realmOwnerId || isSuperAdmin;

  const { data: deviceStatus, refetch: refetchStatus } = trpc.realm.getDeviceStatus.useQuery(
    { realmId },
    {
      refetchInterval: 10000, // 降低到 10 秒（主要依赖 WebSocket 推送）
      onSuccess: (data) => {
        if (data.isOnline) {
          onDeviceOnline();
        }
      },
    }
  );

  const generateCommandMutation = trpc.realm.generateDeviceStartCommand.useMutation();
  const rotateKeyMutation = trpc.realm.rotateDeviceApiKey.useMutation();

  const [copied, setCopied] = useState<'command' | 'key' | null>(null);
  const [commandData, setCommandData] = useState<any>(null);

  const copyToClipboard = (text: string, type: 'command' | 'key') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerateCommand = async () => {
    try {
      const result = await generateCommandMutation.mutateAsync({ realmId });
      setCommandData(result);
    } catch (error: any) {
      console.error('Failed to generate command:', error);
      alert(error.message || 'Failed to generate command');
    }
  };

  const handleRotateKey = async () => {
    if (!confirm('Are you sure you want to rotate the API key? The old key will be revoked immediately.')) {
      return;
    }

    try {
      const result = await rotateKeyMutation.mutateAsync({ realmId });
      setCommandData(result);
      refetchStatus();
    } catch (error: any) {
      console.error('Failed to rotate key:', error);
      alert(error.message || 'Failed to rotate key');
    }
  };

  // 非 owner 不显示面板
  if (!isOwner) {
    return (
      <div className="mt-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <h4 className="font-semibold text-red-100">Device Offline</h4>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-red-200/80">
          Only the realm owner can start the device. Please contact the owner.
        </p>
      </div>
    );
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

      {/* 生成命令按钮 */}
      {!commandData && (
        <div className="mb-4">
          <button
            onClick={handleGenerateCommand}
            disabled={generateCommandMutation.isPending}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" />
            {generateCommandMutation.isPending ? 'Generating...' : 'Generate Start Command'}
          </button>
        </div>
      )}

      {/* 显示命令和 API Key */}
      {commandData && (
        <>
          {/* 启动命令 */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-white/80 mb-1">
              Command:
            </label>
            <div className="flex gap-2">
              <code className="flex-1 p-2 bg-black/30 border border-white/10 rounded text-xs overflow-x-auto font-mono text-white/90">
                {commandData.startCommand}
              </code>
              <button
                onClick={() => copyToClipboard(commandData.startCommand, 'command')}
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
          {commandData.apiKey && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-white/80 mb-1">
                API Key:
              </label>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-black/30 border border-white/10 rounded text-xs overflow-x-auto font-mono text-white/90">
                  {commandData.apiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(commandData.apiKey, 'key')}
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
              {commandData.warning && (
                <p className="text-xs text-red-400 mt-1">
                  {commandData.warning}
                </p>
              )}
            </div>
          )}

          {/* 重新生成按钮 */}
          <div className="mb-3">
            <button
              onClick={handleRotateKey}
              disabled={rotateKeyMutation.isPending}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              {rotateKeyMutation.isPending ? 'Generating...' : 'Generate New API Key'}
            </button>
          </div>
        </>
      )}

      {/* 状态指示 */}
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-white/60">Waiting for device to come online...</span>
      </div>
    </div>
  );
}
