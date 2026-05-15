import { create } from 'zustand'

interface LoadingState {
  isLoading: boolean
  message: string
  progress: number
  showProgress: boolean
  setLoading: (loading: boolean, message?: string) => void
  setProgress: (progress: number) => void
  reset: () => void
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  message: 'Loading...',
  progress: 0,
  showProgress: false,

  setLoading: (loading, message) =>
    set({
      isLoading: loading,
      message: message || 'Loading...',
      progress: 0,
      showProgress: false,
    }),

  setProgress: (progress) =>
    set({
      progress,
      showProgress: true,
    }),

  reset: () =>
    set({
      isLoading: false,
      message: 'Loading...',
      progress: 0,
      showProgress: false,
    }),
}))
