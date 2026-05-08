import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { useSidebar } from '../../hooks/useSidebar';
import { useResponsive } from '../../hooks/useResponsive';

export function MainLayout() {
  const { isOpen, toggle } = useSidebar();
  const { isMobile } = useResponsive();

  return (
    <div className="flex h-screen bg-[#0f111a] text-[#e4e4e7]">
      {!isMobile && <Sidebar collapsed={!isOpen} onToggle={toggle} />}

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#2a2d3e] border-t-[#3b82f6]"></div>
                <p className="mt-4 text-[#9ca3af]">Loading...</p>
              </div>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {isMobile && <MobileNav />}
    </div>
  );
}
