/**
 * RealmSelector - 统一的 Realm 选择器
 *
 * 复用场景：
 * - 登录后选择 Realm (variant='page')
 * - 切换 Realm (variant='modal')
 * - Realm 不可用时重新选择 (variant='modal')
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RealmCard, DeviceStartCommandPanel, CreateRealmForm } from './';
import type { RealmInfo } from './';
import { useRealmStore } from '@/core/stores/realmStore';
import { LoginHeroThree } from '@/shared/components/ui/animations/LoginHeroThree';
import { GlassCard, GlassCardVariants } from '@/shared/components/ui/cards/GlassCard';
import { trpc } from '@/lib/trpc';

interface RealmSelectorProps {
  realms: RealmInfo[];
  onSelect?: (realmId: string) => void;
  variant?: 'modal' | 'page';
}

export function RealmSelector({
  realms: initialRealms,
  onSelect,
  variant = 'page',
}: RealmSelectorProps) {
  const [realms, setRealms] = useState<RealmInfo[]>(initialRealms);
  const [selectedRealmId, setSelectedRealmId] = useState<string>();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedRealmId, setExpandedRealmId] = useState<string | null>(null);
  const { setCurrentRealm } = useRealmStore();
  const navigate = useNavigate();

  // 初始化时更新 realms
  useEffect(() => {
    setRealms(initialRealms);
  }, [initialRealms]);

  // 订阅 device 状态变化（WebSocket）
  trpc.realm.subscribeDeviceStatus.useSubscription(undefined, {
    onData: (data) => {
      // 收到 device 状态变化通知，立即更新本地状态
      setRealms(prev => prev.map(r =>
        r.realmId === data.realmId
          ? { ...r, deviceStatus: data.deviceStatus }
          : r
      ));
    },
    onError: (error) => {
      console.error('Device status subscription error:', error);
    },
  });

  const handleRealmClick = (realm: RealmInfo) => {
    if (realm.deviceStatus !== 'online') {
      // Device 离线，展开启动命令，不允许进入
      setExpandedRealmId(realm.realmId);
      return;
    }

    // Device 在线，允许进入
    setCurrentRealm(realm.realmId);
    onSelect?.(realm.realmId);
    navigate('/'); // 导航到首页 (Dashboard)
  };

  const handleDeviceOnline = (realm: RealmInfo) => {
    // Device 上线后，更新本地状态
    setRealms(prev => prev.map(r =>
      r.realmId === realm.realmId
        ? { ...r, deviceStatus: 'online' as const }
        : r
    ));

    // 关闭启动命令面板
    setExpandedRealmId(null);

    // 自动进入 realm
    setCurrentRealm(realm.realmId);
    onSelect?.(realm.realmId);
    navigate('/'); // 导航到首页 (Dashboard)
  };

  const handleCreateSuccess = (newRealm: RealmInfo) => {
    setShowCreateForm(false);
    // 自动展开新 Realm 的启动命令
    setExpandedRealmId(newRealm.realmId);
  };

  return (
    <div className="fixed inset-0 bg-gray-950">
      {/* Three.js 背景动画层 */}
      <div className="pointer-events-none absolute inset-0">
        <LoginHeroThree />
      </div>

      {/* 内容层 */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-4xl"
        >
          <GlassCard {...GlassCardVariants.hero} className="p-8">
            {/* 标题 */}
            <h2 className="text-2xl font-bold mb-6 text-center text-white">
              Select a Realm
            </h2>

            {/* Realm 列表 */}
            <div className="space-y-3 mb-6">
              {realms.map((realm) => (
                <div key={realm.realmId}>
                  <RealmCard
                    realm={realm}
                    selected={selectedRealmId === realm.realmId}
                    onClick={() => handleRealmClick(realm)}
                    showDeviceStatus
                    variant="default"
                    className={realm.deviceStatus === 'offline' ? 'cursor-not-allowed' : ''}
                  />

                  {/* 展开的启动命令区域 */}
                  <AnimatePresence>
                    {expandedRealmId === realm.realmId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <DeviceStartCommandPanel
                          realmId={realm.realmId}
                          realmOwnerId={realm.ownerId || ''}
                          onDeviceOnline={() => handleDeviceOnline(realm)}
                          onClose={() => setExpandedRealmId(null)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* 创建新 Realm 按钮 */}
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full p-4 border-2 border-dashed border-white/20 rounded-lg hover:border-blue-500/50 transition-colors text-white/60 hover:text-blue-400"
            >
              + Create New Realm
            </button>

            {/* 内联创建表单 */}
            <AnimatePresence>
              {showCreateForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <CreateRealmForm
                    onSuccess={handleCreateSuccess}
                    onCancel={() => setShowCreateForm(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
