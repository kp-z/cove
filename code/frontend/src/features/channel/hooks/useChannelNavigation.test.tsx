import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChannelNavigation } from './useChannelNavigation';
import { MemoryRouter, Route, Routes } from 'react-router';

// Mock react-router hooks
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('useChannelNavigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should return undefined channelId and threadId when not in route', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={children} />
        </Routes>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useChannelNavigation(), { wrapper });

    expect(result.current.channelId).toBeUndefined();
    expect(result.current.threadId).toBeUndefined();
  });

  it('should return channelId from route params', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/channel/channel-123']}>
        <Routes>
          <Route path="/channel/:channelId" element={children} />
        </Routes>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useChannelNavigation(), { wrapper });

    expect(result.current.channelId).toBe('channel-123');
    expect(result.current.threadId).toBeUndefined();
  });

  it('should return both channelId and threadId from route params', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/channel/channel-123/thread-456']}>
        <Routes>
          <Route path="/channel/:channelId/:threadId" element={children} />
        </Routes>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useChannelNavigation(), { wrapper });

    expect(result.current.channelId).toBe('channel-123');
    expect(result.current.threadId).toBe('thread-456');
  });

  it('should navigate to channel when selectChannel is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={children} />
        </Routes>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useChannelNavigation(), { wrapper });

    act(() => {
      result.current.selectChannel('channel-789');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/channel/channel-789');
  });

  it('should navigate to thread when selectThread is called with channelId', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/channel/channel-123']}>
        <Routes>
          <Route path="/channel/:channelId" element={children} />
        </Routes>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useChannelNavigation(), { wrapper });

    act(() => {
      result.current.selectThread('thread-456');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/channel/channel-123/thread-456');
  });

  it('should not navigate to thread when selectThread is called without channelId', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={children} />
        </Routes>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useChannelNavigation(), { wrapper });

    act(() => {
      result.current.selectThread('thread-456');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should navigate to /channel when clearSelection is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/channel/channel-123']}>
        <Routes>
          <Route path="/channel/:channelId" element={children} />
        </Routes>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useChannelNavigation(), { wrapper });

    act(() => {
      result.current.clearSelection();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/channel');
  });
});
