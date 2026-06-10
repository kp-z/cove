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
import { useRealmRealtimeStatus } from '@/features/realm/hooks/useRealmRealtimeStatus';

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
  const [selectedRealmId, setSelectedRealmId] = useState<string>();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedRealmId, setExpandedRealmId] = useState<string | null>(null);
  const { realms, setCurrentRealm } = useRealmStore();
  const navigate = useNavigate();

  useRealmRealtimeStatus({
    initialRealms,
    enabled: variant === 'page',
  });

  const handleRealmClick = (realm: RealmInfo) => {
    setSelectedRealmId(realm.realmId);

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

  const handleCreateSuccess = (newRealm: RealmInfo) => {
    setShowCreateForm(false);
    // 自动展开新 Realm 的启动命令
    setExpandedRealmId(newRealm.realmId);
  };

  // 步骤 2：当离线面板对应的 realm 变为 online 时自动进入。
  useEffect(() => {
    if (!expandedRealmId) {
      return;
    }

    const expandedRealm = realms.find((item) => item.realmId === expandedRealmId);
    if (!expandedRealm || expandedRealm.deviceStatus !== 'online') {
      return;
    }

    setExpandedRealmId(null);
    setCurrentRealm(expandedRealm.realmId);
    onSelect?.(expandedRealm.realmId);
    navigate('/');
  }, [expandedRealmId, realms, navigate, onSelect, setCurrentRealm]);

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
