import { create } from 'zustand';

type PanelMode = 'docked' | 'floating';

interface ChannelPanelState {
  isOpen: boolean;
  channel_id: string | null;
  mode: PanelMode;
  openChannel: (channel_id: string) => void;
  closeChannel: () => void;
  toggleChannel: (channel_id?: string) => void;
  setMode: (mode: PanelMode) => void;
}

export const useChannelPanelStore = create<ChannelPanelState>((set, get) => ({
  isOpen: false,
  channel_id: null,
  mode: 'docked',
  openChannel: (channel_id) => set({ isOpen: true, channel_id }),
  closeChannel: () => set({ isOpen: false, channel_id: null }),
  toggleChannel: (channel_id) => {
    const state = get();
    if (state.isOpen && state.channel_id === channel_id) {
      set({ isOpen: false, channel_id: null });
    } else {
      set({ isOpen: true, channel_id: channel_id ?? state.channel_id });
    }
  },
  setMode: (mode) => set({ mode }),
}));
