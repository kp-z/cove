import { describe, it, expect, beforeEach } from 'vitest';
import { useLoadingStore } from './loadingStore';

describe('loadingStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useLoadingStore.getState().reset();
  });

  it('should have initial state', () => {
    const state = useLoadingStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.message).toBe('Loading...');
    expect(state.progress).toBe(0);
    expect(state.showProgress).toBe(false);
  });

  it('should set loading state', () => {
    const { setLoading } = useLoadingStore.getState();

    setLoading(true, 'Loading data...');

    const state = useLoadingStore.getState();
    expect(state.isLoading).toBe(true);
    expect(state.message).toBe('Loading data...');
    expect(state.progress).toBe(0);
    expect(state.showProgress).toBe(false);
  });

  it('should use default message when not provided', () => {
    const { setLoading } = useLoadingStore.getState();

    setLoading(true);

    const state = useLoadingStore.getState();
    expect(state.isLoading).toBe(true);
    expect(state.message).toBe('Loading...');
  });

  it('should set progress', () => {
    const { setProgress } = useLoadingStore.getState();

    setProgress(50);

    const state = useLoadingStore.getState();
    expect(state.progress).toBe(50);
    expect(state.showProgress).toBe(true);
  });

  it('should reset to initial state', () => {
    const { setLoading, setProgress, reset } = useLoadingStore.getState();

    // Set some state
    setLoading(true, 'Custom message');
    setProgress(75);

    // Reset
    reset();

    const state = useLoadingStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.message).toBe('Loading...');
    expect(state.progress).toBe(0);
    expect(state.showProgress).toBe(false);
  });

  it('should handle multiple progress updates', () => {
    const { setProgress } = useLoadingStore.getState();

    setProgress(25);
    expect(useLoadingStore.getState().progress).toBe(25);

    setProgress(50);
    expect(useLoadingStore.getState().progress).toBe(50);

    setProgress(100);
    expect(useLoadingStore.getState().progress).toBe(100);
  });

  it('should reset progress when setting loading', () => {
    const { setProgress, setLoading } = useLoadingStore.getState();

    setProgress(50);
    expect(useLoadingStore.getState().progress).toBe(50);
    expect(useLoadingStore.getState().showProgress).toBe(true);

    setLoading(true, 'New loading');
    expect(useLoadingStore.getState().progress).toBe(0);
    expect(useLoadingStore.getState().showProgress).toBe(false);
  });
});
