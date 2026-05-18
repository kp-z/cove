import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChannelPin } from './useChannelPin';
import { usePinnedChannels } from './usePinnedChannels';

// Mock the usePinnedChannels hook
vi.mock('./usePinnedChannels');

describe('useChannelPin', () => {
  const mockSetPinnedChannels = vi.fn();
  const userId = 'user-kp';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return pinned channels and operations', () => {
    vi.mocked(usePinnedChannels).mockReturnValue({
      pinnedChannels: ['channel-1', 'channel-2'],
      setPinnedChannels: mockSetPinnedChannels,
      isLoading: false,
    });

    const { result } = renderHook(() => useChannelPin(userId));

    expect(result.current.pinnedChannels).toEqual(['channel-1', 'channel-2']);
    expect(result.current.isPinned('channel-1')).toBe(true);
    expect(result.current.isPinned('channel-3')).toBe(false);
  });

  it('should pin a channel', async () => {
    vi.mocked(usePinnedChannels).mockReturnValue({
      pinnedChannels: ['channel-1'],
      setPinnedChannels: mockSetPinnedChannels,
      isLoading: false,
    });

    const { result } = renderHook(() => useChannelPin(userId));

    await result.current.pinChannel('channel-2');

    expect(mockSetPinnedChannels).toHaveBeenCalledWith(['channel-1', 'channel-2']);
  });

  it('should not pin a channel that is already pinned', async () => {
    vi.mocked(usePinnedChannels).mockReturnValue({
      pinnedChannels: ['channel-1', 'channel-2'],
      setPinnedChannels: mockSetPinnedChannels,
      isLoading: false,
    });

    const { result } = renderHook(() => useChannelPin(userId));

    await result.current.pinChannel('channel-1');

    expect(mockSetPinnedChannels).not.toHaveBeenCalled();
  });

  it('should throw error when pinning more than 10 channels', async () => {
    const tenChannels = Array.from({ length: 10 }, (_, i) => `channel-${i + 1}`);
    vi.mocked(usePinnedChannels).mockReturnValue({
      pinnedChannels: tenChannels,
      setPinnedChannels: mockSetPinnedChannels,
      isLoading: false,
    });

    const { result } = renderHook(() => useChannelPin(userId));

    await expect(result.current.pinChannel('channel-11')).rejects.toThrow(
      '最多只能置顶 10 个频道'
    );
  });

  it('should unpin a channel', async () => {
    vi.mocked(usePinnedChannels).mockReturnValue({
      pinnedChannels: ['channel-1', 'channel-2', 'channel-3'],
      setPinnedChannels: mockSetPinnedChannels,
      isLoading: false,
    });

    const { result } = renderHook(() => useChannelPin(userId));

    await result.current.unpinChannel('channel-2');

    expect(mockSetPinnedChannels).toHaveBeenCalledWith(['channel-1', 'channel-3']);
  });

  it('should toggle pin state', async () => {
    vi.mocked(usePinnedChannels).mockReturnValue({
      pinnedChannels: ['channel-1', 'channel-2'],
      setPinnedChannels: mockSetPinnedChannels,
      isLoading: false,
    });

    const { result } = renderHook(() => useChannelPin(userId));

    // Toggle off (unpin)
    await result.current.togglePin('channel-1');
    expect(mockSetPinnedChannels).toHaveBeenCalledWith(['channel-2']);

    // Toggle on (pin)
    await result.current.togglePin('channel-3');
    expect(mockSetPinnedChannels).toHaveBeenCalledWith(['channel-1', 'channel-2', 'channel-3']);
  });

  it('should reorder pinned channels', async () => {
    vi.mocked(usePinnedChannels).mockReturnValue({
      pinnedChannels: ['channel-1', 'channel-2', 'channel-3'],
      setPinnedChannels: mockSetPinnedChannels,
      isLoading: false,
    });

    const { result } = renderHook(() => useChannelPin(userId));

    await result.current.reorderPinned(['channel-3', 'channel-1', 'channel-2']);

    expect(mockSetPinnedChannels).toHaveBeenCalledWith(['channel-3', 'channel-1', 'channel-2']);
  });

  it('should check if a channel is pinned', () => {
    vi.mocked(usePinnedChannels).mockReturnValue({
      pinnedChannels: ['channel-1', 'channel-2'],
      setPinnedChannels: mockSetPinnedChannels,
      isLoading: false,
    });

    const { result } = renderHook(() => useChannelPin(userId));

    expect(result.current.isPinned('channel-1')).toBe(true);
    expect(result.current.isPinned('channel-2')).toBe(true);
    expect(result.current.isPinned('channel-3')).toBe(false);
  });

  it('should expose loading state', () => {
    vi.mocked(usePinnedChannels).mockReturnValue({
      pinnedChannels: [],
      setPinnedChannels: mockSetPinnedChannels,
      isLoading: true,
    });

    const { result } = renderHook(() => useChannelPin(userId));

    expect(result.current.isLoading).toBe(true);
  });
});
