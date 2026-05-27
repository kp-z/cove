import { useState } from 'react';
import { Server, Copy, Check, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useDeviceStatus } from '@/lib/trpc/hooks/realm.hooks';
import { notify } from '@/core/services/notificationService';

interface RealmDeviceCardProps {
  realmId: string;
}

export function RealmDeviceCard({ realmId }: RealmDeviceCardProps) {
  const { data: deviceStatus, isLoading, error } = useDeviceStatus(realmId);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      notify.toast.success('Copied', 'Command copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      notify.toast.error('Failed to copy', 'Could not copy to clipboard');
    }
  };

  const formatLastSeen = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return 'Never';
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Server className="w-5 h-5 text-white/60" />
          <h3 className="text-lg font-semibold text-white">Local Device</h3>
        </div>
        <div className="text-sm text-white/40">Loading device status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Server className="w-5 h-5 text-white/60" />
          <h3 className="text-lg font-semibold text-white">Local Device</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>Failed to load device status</span>
        </div>
      </div>
    );
  }

  if (!deviceStatus?.hasDevice) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Server className="w-5 h-5 text-white/60" />
          <h3 className="text-lg font-semibold text-white">Local Device</h3>
        </div>
        <div className="text-sm text-white/40">No device configured for this realm</div>
      </div>
    );
  }

  const { isOnline, device, startCommand, warning } = deviceStatus;

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Server className="w-5 h-5 text-white/60" />
        <h3 className="text-lg font-semibold text-white">Local Device</h3>
      </div>

      {isOnline ? (
        // Online state
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-sm font-medium text-white">{device.name}</div>
                <div className="text-xs text-white/40">Device ID: {device.deviceId}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-medium text-green-400">Online</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08]">
            <div className="text-xs text-white/40">Last seen</div>
            <div className="text-sm text-white/60 mt-1">{formatLastSeen(device.lastSeenAt)}</div>
          </div>
        </div>
      ) : (
        // Offline state
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-orange-400" />
              <div>
                <div className="text-sm font-medium text-white">{device.name}</div>
                <div className="text-xs text-white/40">Device ID: {device.deviceId}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-xs font-medium text-orange-400">Offline</span>
            </div>
          </div>

          {device.lastSeenAt && (
            <div className="text-xs text-white/40">
              Last seen: {formatLastSeen(device.lastSeenAt)}
            </div>
          )}

          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            {warning && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-orange-400">{warning}</div>
              </div>
            )}

            <div>
              <div className="text-xs text-white/60 mb-2">Start your local device with this command:</div>
              <div className="relative">
                <pre className="bg-black/40 border border-white/[0.08] rounded-lg p-3 text-xs text-white/80 overflow-x-auto">
                  {startCommand}
                </pre>
                <button
                  onClick={() => handleCopy(startCommand || '')}
                  className="absolute top-2 right-2 p-2 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
                  title="Copy command"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/60" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
