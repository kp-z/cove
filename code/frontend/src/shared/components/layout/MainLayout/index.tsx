import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '../Sidebar';
import { TopBar } from '../TopBar';
import { MobileNav } from '../MobileNav';
import { useSidebar } from '../../../hooks/useSidebar';
import { useResponsive } from '../../../hooks/useResponsive';
import { useChannelPanelStore } from '@/features/channel/stores/channelStore';
import { ChannelPanel } from '@/features/channel/components/ChannelPanel';
import { useResizable } from '@/features/channel/hooks/useResizable';
import { X, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function ChannelPanelWrapper() {
  const { t } = useTranslation('layout');
  const { channel_id: channelId, closeChannel, mode, setMode } = useChannelPanelStore();
  const { width: panelWidth, onDragStart } = useResizable({
    defaultWidth: 500,
    minWidth: 400,
    maxWidth: 800,
    storageKey: 'channel-panel-width',
  });

  if (!channelId) return null;

  const isDocked = mode === 'docked';

  const panelContent = (
    <>
      {/* Panel toolbar */}
      <div className="flex items-center justify-end gap-1 px-2 py-1.5 border-b border-white/5 shrink-0">
        <button
          onClick={() => setMode(isDocked ? 'floating' : 'docked')}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          title={isDocked ? t('channelPanel.floatingMode') : t('channelPanel.dockedMode')}
        >
          {isDocked ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
        </button>
        <button
          onClick={closeChannel}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          title={t('channelPanel.close')}
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChannelPanel
          channel_id={channelId}
          thread_id={null}
          onClose={closeChannel}
        />
      </div>
    </>
  );

  if (!isDocked) {
    return (
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{ width: panelWidth }}
        className="absolute right-4 top-2 bottom-2 z-40 flex flex-col bg-[#13151f] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
      >
        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/30 rounded-l-2xl transition-colors z-10"
        />
        {panelContent}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: panelWidth, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative border-l border-[#2a2d3e] overflow-hidden shrink-0 flex flex-col"
    >
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/30 transition-colors z-10"
      />
      {panelContent}
    </motion.div>
  );
}

export function MainLayout() {
  const { isOpen, toggle } = useSidebar();
  const { isMobile } = useResponsive();
  const { isOpen: channelOpen } = useChannelPanelStore();

  return (
    <div className="flex h-screen bg-[#0f111a] text-[#e4e4e7]">
      {!isMobile && <Sidebar collapsed={!isOpen} onToggle={toggle} />}

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <div className="flex-1 flex overflow-hidden relative">
          <Suspense
            fallback={
              <div className="h-full flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#2a2d3e] border-t-[#3b82f6]"></div>
                  <p className="mt-4 text-[#9ca3af]">Loading...</p>
                </div>
              </div>
            }
          >
            <div className="flex-1 overflow-hidden">
              <Outlet />
            </div>
          </Suspense>

          <AnimatePresence>
            {channelOpen && <ChannelPanelWrapper />}
          </AnimatePresence>
        </div>
      </main>

      {isMobile && <MobileNav />}
    </div>
  );
}
