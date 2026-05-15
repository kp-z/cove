import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { router } from '@/core/router';
import { trpc, trpcClient } from '@/lib/trpc';
import { GlobalLoader } from '@/shared/components/layout/GlobalLoader';
import { useLoadingStore } from '@/shared/stores';

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
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
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
  );
}

export default App;

