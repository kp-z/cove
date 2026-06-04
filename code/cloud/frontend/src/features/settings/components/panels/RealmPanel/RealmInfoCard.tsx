import { useState } from 'react';
import { Settings, Server, Copy, Check, AlertCircle, Wifi, WifiOff, Plus } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useDeviceStatus } from '@/lib/trpc/hooks/realm.hooks';
import { notify } from '@/core/services/notificationService';
import { Logo } from '@/shared/components/layout/Sidebar/Logo';
import { RealmLogo } from '@/features/realm/components/RealmLogo';
import { getAvatarUrl } from '@/shared/components/display/Avatar';
import type { Realm } from '@/lib/trpc-types';

interface RealmInfoCardProps {
  realm: Realm;
  allRealms: Realm[];
  onEdit?: () => void;
  onSwitch?: (realmId: string) => void;
  onCreateClick?: () => void;
  canEdit: boolean;
}

export function RealmInfoCard({ realm, allRealms, onEdit, onSwitch, onCreateClick, canEdit }: RealmInfoCardProps) {
  const { data: deviceStatus, isLoading: deviceLoading } = useDeviceStatus(realm.realm_id);
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  const handleSwitchRealm = (realmId: string) => {
    if (onSwitch) {
      onSwitch(realmId);
      setDropdownOpen(false);
    }
  };

  const handleCreateClick = () => {
    if (onCreateClick) {
      onCreateClick();
      setDropdownOpen(false);
    }
  };

  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Realm Info Section - Left */}
        <div className="flex items-start gap-4">
          {/* Use the same Logo component as Sidebar with dropdown */}
          <div className="flex-1 min-w-0 [&_button]:w-auto [&_button]:justify-start [&_button]:h-auto [&_button]:py-2 [&_img]:w-12 [&_img]:h-12 [&_.text-sm]:text-xl [&_.text-\[8px\]]:text-xs">
            {(onSwitch || onCreateClick) ? (
              <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenu.Trigger asChild>
                  <div className="max-w-full">
                    <Logo collapsed={false} />
                  </div>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="start"
                    sideOffset={8}
                    className="w-80 bg-[#111114] border border-white/[0.10] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1 z-50"
                  >
                    {allRealms.length > 1 && onSwitch && (
                      <>
                        <ScrollArea className="max-h-96">
                          <div className="py-1">
                            {allRealms.map((r) => {
                              const isSelected = r.realm_id === realm.realm_id;
                              const logoUrl = getAvatarUrl(r.logo?.url || r.logo_url);

                              return (
                                <DropdownMenu.Item
                                  key={r.realm_id}
                                  onClick={isSelected ? undefined : () => handleSwitchRealm(r.realm_id)}
                                  disabled={isSelected}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer outline-none transition-colors ${
                                    isSelected
                                      ? 'bg-cyan-500/20 text-cyan-400 cursor-default'
                                      : 'text-white hover:bg-white/[0.08] focus:bg-white/[0.08]'
                                  }`}
                                >
                                  <RealmLogo
                                    logoUrl={logoUrl}
                                    displayName={r.display_name}
                                    size="sm"
                                    className="w-10 h-10"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">
                                      {r.display_name}
                                    </p>
                                    {r.description && (
                                      <p className="text-xs text-white/50 line-clamp-2 mt-0.5">
                                        {r.description}
                                      </p>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                  )}
                                </DropdownMenu.Item>
                              );
                            })}
                          </div>
                        </ScrollArea>

                        {canEdit && onCreateClick && (
                          <DropdownMenu.Separator className="h-px bg-white/[0.08] my-1" />
                        )}
                      </>
                    )}

                    {canEdit && onCreateClick && (
                      <DropdownMenu.Item
                        onClick={handleCreateClick}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-cyan-400 hover:bg-cyan-500/10 rounded-lg cursor-pointer outline-none transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="font-medium">Create New Realm</span>
                      </DropdownMenu.Item>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <Logo collapsed={false} />
            )}

            {/* Additional Realm Information */}
            <div className="mt-4">
              {/* Realm ID and Status Badges - single line */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">ID:</span>
                  <code className="text-xs font-mono text-white/60 bg-white/[0.05] px-2 py-0.5 rounded">
                    {realm.realm_id}
                  </code>
                </div>
                <span className="text-[10px] font-medium px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                  {realm.status.toUpperCase()}
                </span>
                <span className="text-[10px] font-medium px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {realm.visibility.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Button */}
          {onEdit && (
            <button
              onClick={onEdit}
              className="shrink-0 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Edit Realm"
            >
              <Settings size={18} />
            </button>
          )}
        </div>

        {/* Device Status Section - Right */}
        <div className="lg:border-l lg:border-white/[0.08] lg:pl-6">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-white/60" />
            <h4 className="text-sm font-semibold text-white">Local Device</h4>
          </div>

          {deviceLoading ? (
            <div className="text-sm text-white/40">Loading...</div>
          ) : !deviceStatus?.hasDevice ? (
            <div className="text-sm text-white/40">No device configured</div>
          ) : deviceStatus.isOnline ? (
            // Online state - Compact
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <Wifi className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{deviceStatus.device.name}</div>
                    <div className="text-xs text-white/40 truncate">{deviceStatus.device.deviceId}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-medium text-green-400">Online</span>
                </div>
              </div>

              <div className="text-xs text-white/40">
                Last seen: {formatLastSeen(deviceStatus.device.lastSeenAt)}
              </div>
            </div>
          ) : (
            // Offline state - Compact
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <WifiOff className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{deviceStatus.device.name}</div>
                    <div className="text-xs text-white/40 truncate">{deviceStatus.device.deviceId}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <span className="text-[10px] font-medium text-orange-400">Offline</span>
                </div>
              </div>

              {deviceStatus.device.lastSeenAt && (
                <div className="text-xs text-white/40">
                  Last seen: {formatLastSeen(deviceStatus.device.lastSeenAt)}
                </div>
              )}

              {deviceStatus.warning && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <AlertCircle className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-orange-400">{deviceStatus.warning}</div>
                </div>
              )}

              <div>
                <div className="text-xs text-white/50 mb-1.5">Start command:</div>
                <div className="relative">
                  <pre className="bg-black/40 border border-white/[0.08] rounded-lg p-2 pr-10 text-xs text-white/80 overflow-x-auto whitespace-pre-wrap break-all">
                    {deviceStatus.startCommand}
                  </pre>
                  <button
                    onClick={() => handleCopy(deviceStatus.startCommand || '')}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
                    title="Copy command"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-white/60" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
