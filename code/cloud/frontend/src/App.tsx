import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { router } from '@/core/router';
import { trpc, trpcClient } from '@/lib/trpc';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { useLoadingStore } from '@/shared/stores';
import { useGlobalDeviceMonitor } from '@/core/hooks/useGlobalDeviceMonitor';
import i18n from '@/core/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/**
 * AppMonitors - 全局监控组件
 * 必须在 trpc.Provider 内部才能使用 tRPC hooks
 */
function AppMonitors() {
  useGlobalDeviceMonitor();
  return null;
}

function App() {
  const { isLoading, message, progress, showProgress } = useLoadingStore();

  return (
    <I18nextProvider i18n={i18n}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {/* Global Monitors */}
          <AppMonitors />

          {/* Toast Notifications */}
          <Toaster
        position="top-right"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: 'bg-transparent shadow-none',
          },
        }}
      />

          {/* Global Loader */}
          <AnimatePresence>
            {isLoading && (
              <PageLoader
                text={message}
                progress={progress}
                showProgress={showProgress}
              />
            )}
          </AnimatePresence>

          {/* Router */}
          <Suspense fallback={<PageLoader text="Loading..." />}>
            <RouterProvider router={router} />
          </Suspense>
        </QueryClientProvider>
      </trpc.Provider>
    </I18nextProvider>
  );
}

export default App;

