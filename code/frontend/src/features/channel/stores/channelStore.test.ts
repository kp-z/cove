import { describe, it, expect, beforeEach } from 'vitest';
import { useChannelPanelStore } from './channelStore';

describe('channelStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useChannelPanelStore.setState({
      isOpen: false,
      channel_id: null,
      mode: 'docked',
    });
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useChannelPanelStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.channel_id).toBe(null);
      expect(state.mode).toBe('docked');
    });
  });

  describe('openChannel', () => {
    it('should open channel with given id', () => {
      const { openChannel } = useChannelPanelStore.getState();
      openChannel('channel-123');

      const state = useChannelPanelStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.channel_id).toBe('channel-123');
    });

    it('should switch to different channel when already open', () => {
      const { openChannel } = useChannelPanelStore.getState();
      openChannel('channel-123');
      openChannel('channel-456');

      const state = useChannelPanelStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.channel_id).toBe('channel-456');
    });
  });

  describe('closeChannel', () => {
    it('should close channel and clear channel_id', () => {
      const { openChannel, closeChannel } = useChannelPanelStore.getState();
      openChannel('channel-123');
      closeChannel();

      const state = useChannelPanelStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.channel_id).toBe(null);
    });

    it('should work when already closed', () => {
      const { closeChannel } = useChannelPanelStore.getState();
      closeChannel();

      const state = useChannelPanelStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.channel_id).toBe(null);
    });
  });

  describe('toggleChannel', () => {
    it('should open channel when closed', () => {
      const { toggleChannel } = useChannelPanelStore.getState();
      toggleChannel('channel-123');

      const state = useChannelPanelStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.channel_id).toBe('channel-123');
    });

    it('should close channel when open with same id', () => {
      const { toggleChannel } = useChannelPanelStore.getState();
      toggleChannel('channel-123');
      toggleChannel('channel-123');

      const state = useChannelPanelStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.channel_id).toBe(null);
    });

    it('should switch to different channel when open with different id', () => {
      const { toggleChannel } = useChannelPanelStore.getState();
      toggleChannel('channel-123');
      toggleChannel('channel-456');

      const state = useChannelPanelStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.channel_id).toBe('channel-456');
    });

    it('should use current channel_id when no id provided and panel is closed', () => {
      const { openChannel, closeChannel, toggleChannel } = useChannelPanelStore.getState();

      // Open a channel, then close it (channel_id should remain)
      openChannel('channel-123');
      closeChannel();

      // Manually set channel_id without opening (simulating a previous state)
      useChannelPanelStore.setState({ channel_id: 'channel-123' });

      // Toggle without providing id
      toggleChannel();

      const state = useChannelPanelStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.channel_id).toBe('channel-123');
    });

    it('should close when toggling with same id and panel is open', () => {
      const { openChannel, toggleChannel } = useChannelPanelStore.getState();
      openChannel('channel-123');
      // Toggle with the same channel_id should close it
      toggleChannel('channel-123');

      const state = useChannelPanelStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.channel_id).toBe(null);
    });
  });

  describe('setMode', () => {
    it('should change mode to floating', () => {
      const { setMode } = useChannelPanelStore.getState();
      setMode('floating');

      expect(useChannelPanelStore.getState().mode).toBe('floating');
    });

    it('should change mode to docked', () => {
      const { setMode } = useChannelPanelStore.getState();
      setMode('floating');
      setMode('docked');

      expect(useChannelPanelStore.getState().mode).toBe('docked');
    });

    it('should not affect isOpen or channel_id', () => {
      const { openChannel, setMode } = useChannelPanelStore.getState();
      openChannel('channel-123');
      setMode('floating');

      const state = useChannelPanelStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.channel_id).toBe('channel-123');
      expect(state.mode).toBe('floating');
    });
  });
});
