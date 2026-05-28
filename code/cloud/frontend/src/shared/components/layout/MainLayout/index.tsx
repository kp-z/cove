import { Outlet, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '../Sidebar';
import { TopBar } from '../TopBar';
import { MobileNav } from '../MobileNav';
import { ContentLoader } from '../ContentLoader';
import { useSidebar } from '../../../hooks/useSidebar';
import { useResponsive } from '../../../hooks/useResponsive';
import { useChannelPanelStore } from '@/features/channel/stores/channelStore';
import { ChannelPanel } from '@/features/channel/components/ChannelPanel';
import { useResizable } from '@/features/channel/hooks/useResizable';

function ChannelPanelWrapper() {
  const { channel_id: channelId, thread_id: threadId, message_id: messageId, mode } = useChannelPanelStore();
  const { width: panelWidth, onDragStart } = useResizable({
    defaultWidth: 500,
    minWidth: 400,
    maxWidth: 800,
    storageKey: 'channel-panel-width',
  });

  if (!channelId) return null;

  const isDocked = mode === 'docked';

  const variants = {
    docked: {
      width: panelWidth,
      opacity: 1,
      x: 0,
      transition: {
        width: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    floating: {
      width: panelWidth,
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 30
      }
    }
  };

  const initialVariant = {
    docked: { width: 0, opacity: 0 },
    floating: { x: 40, opacity: 0, scale: 0.95 }
  };

  const exitVariant = {
    docked: { width: 0, opacity: 0, transition: { duration: 0.2 } },
    floating: { x: 40, opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  return (
    <motion.div
      initial={initialVariant[mode]}
      animate={mode}
      exit={exitVariant[mode]}
      variants={variants}
      style={{ width: panelWidth }}
      className={
        isDocked
          ? "relative border-l border-[#2a2d3e] overflow-hidden shrink-0 flex flex-col"
          : "absolute right-4 top-2 bottom-2 z-40 flex flex-col bg-[#13151f] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
      }
    >
      <div
        onMouseDown={onDragStart}
        className={
          isDocked
            ? "absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/30 transition-colors z-10"
            : "absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/30 rounded-l-2xl transition-colors z-10"
        }
      />
      <div className="flex-1 overflow-hidden">
        <ChannelPanel channel_id={channelId} thread_id={threadId} message_id={messageId} />
      </div>
    </motion.div>
  );
}

export function MainLayout() {
  const { isOpen, toggle } = useSidebar();
  const { isMobile } = useResponsive();
  const { isOpen: channelOpen } = useChannelPanelStore();
  const location = useLocation();

  // 移动端在 channel 详情页时隐藏 MobileNav
  const shouldHideMobileNav = isMobile && location.pathname.startsWith('/channel/') && location.pathname !== '/channels';

  return (
    <div className="flex h-screen bg-[#0f111a] text-[#e4e4e7]">
      {!isMobile && <Sidebar collapsed={!isOpen} onToggle={toggle} />}

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <div className="flex-1 flex overflow-hidden relative">
          <Suspense fallback={<ContentLoader text="Loading..." />}>
            <div className="flex-1 overflow-hidden">
              <Outlet />
            </div>
          </Suspense>

          <AnimatePresence mode="wait">
            {channelOpen && !isMobile && <ChannelPanelWrapper />}
          </AnimatePresence>
        </div>
      </main>

      {isMobile && !shouldHideMobileNav && <MobileNav />}
    </div>
  );
}
