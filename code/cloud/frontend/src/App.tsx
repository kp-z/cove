import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { router } from '@/core/router';
import { trpc, trpcClient } from '@/lib/trpc';
import { GlobalLoader } from '@/shared/components/layout/GlobalLoader';
import { useLoadingStore } from '@/shared/stores';
import i18n from '@/core/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function App() {
  const { isLoading, message, progress, showProgress } = useLoadingStore();

  return (
    <I18nextProvider i18n={i18n}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
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
              <GlobalLoader
                message={message}
                progress={progress}
                showProgress={showProgress}
              />
            )}
          </AnimatePresence>

          {/* Router */}
          <RouterProvider router={router} />
        </QueryClientProvider>
      </trpc.Provider>
    </I18nextProvider>
  );
}

export default App;

