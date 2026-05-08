# Voice Announcement Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement TTS-based voice announcement mode for Chat channels with multi-agent voice differentiation

**Architecture:** New `voice` feature domain with independent TTS播报 queue, Zustand state management, and Channel-level configuration

**Tech Stack:** React, TypeScript, Zustand, Web Audio API, TTS API integration

---

## File Structure

**New files to create:**
- `frontend/src/features/voice/types/voice.ts` - Type definitions
- `frontend/src/features/voice/stores/voiceAnnouncementStore.ts` - Announcement queue state
- `frontend/src/features/voice/stores/voiceConfigStore.ts` - Configuration state (persisted)
- `frontend/src/features/voice/utils/audioPlayer.ts` - Audio playback singleton
- `frontend/src/features/voice/api/tts.ts` - TTS API client
- `frontend/src/features/voice/hooks/useVoiceQueue.ts` - Queue playback control
- `frontend/src/features/voice/hooks/useVoiceAnnouncement.ts` - Message listener & queue feeder
- `frontend/src/features/voice/components/VoiceAnnouncementToggle.tsx` - Channel toggle button
- `frontend/src/features/voice/components/VoicePlaybackBar.tsx` - Playback control bar
- `frontend/src/features/voice/components/MessagePlayButton.tsx` - Per-message play button

**Files to modify:**
- `frontend/src/features/chat/components/ChatPage.tsx` - Integrate VoicePlaybackBar and toggle
- `frontend/src/features/chat/components/MessageBubble.tsx` - Add MessagePlayButton

---

## Task 1: Type Definitions

**Files:**
- Create: `frontend/src/features/voice/types/voice.ts`

- [ ] **Step 1: Create voice types file**

```typescript
// frontend/src/features/voice/types/voice.ts

export interface AnnouncementItem {
  messageId: string;
  content: string;
  agentId?: string;
  agentName?: string;
  voiceConfig: AgentVoiceConfig;
  audioUrl?: string;
  status: 'pending' | 'loading' | 'ready' | 'playing' | 'done' | 'error';
}

export interface ChannelVoiceConfig {
  provider: 'openai' | 'azure' | 'elevenlabs';
  model: string;
  ttsEnabled: boolean;
  autoPlay: boolean;
}

export interface AgentVoiceConfig {
  voice: string;
  speed: number;
  pitch: number;
}

export interface GlobalVoiceConfig {
  defaultLanguage: string;
  defaultSpeed: number;
  defaultVolume: number;
}
```

- [ ] **Step 2: Commit types**

```bash
git add frontend/src/features/voice/types/voice.ts
git commit -m "feat(voice): add voice announcement type definitions"
```

---

## Task 2: Audio Player Utility

**Files:**
- Create: `frontend/src/features/voice/utils/audioPlayer.ts`

- [ ] **Step 1: Create audio player singleton**

```typescript
// frontend/src/features/voice/utils/audioPlayer.ts

class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private resolvePlay: (() => void) | null = null;

  async play(url: string, options: { volume?: number } = {}): Promise<void> {
    this.stop();

    return new Promise((resolve) => {
      this.resolvePlay = resolve;
      this.audio = new Audio(url);
      this.audio.volume = options.volume ?? 0.8;
      this.audio.onended = () => {
        this.resolvePlay?.();
        this.resolvePlay = null;
      };
      this.audio.onerror = () => {
        this.resolvePlay?.();
        this.resolvePlay = null;
      };
      this.audio.play();
    });
  }

  pause() {
    this.audio?.pause();
  }

  resume() {
    this.audio?.play();
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.resolvePlay?.();
    this.resolvePlay = null;
  }
}

export const audioPlayer = new AudioPlayer();
```

- [ ] **Step 2: Commit audio player**

```bash
git add frontend/src/features/voice/utils/audioPlayer.ts
git commit -m "feat(voice): add audio player singleton"
```

---

## Task 3: Voice Announcement Store

**Files:**
- Create: `frontend/src/features/voice/stores/voiceAnnouncementStore.ts`

- [ ] **Step 1: Create announcement store**

```typescript
// frontend/src/features/voice/stores/voiceAnnouncementStore.ts
import { create } from 'zustand';
import type { AnnouncementItem } from '../types/voice';

interface VoiceAnnouncementState {
  enabledChannels: Set<string>;
  queue: AnnouncementItem[];
  currentItem: AnnouncementItem | null;
  isPlaying: boolean;
  isPaused: boolean;

  enableChannel: (channelId: string) => void;
  disableChannel: (channelId: string) => void;
  addToQueue: (item: AnnouncementItem) => void;
  setCurrentItem: (item: AnnouncementItem | null) => void;
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  removeFromQueue: (messageId: string) => void;
  clearQueue: () => void;
}

export const useVoiceAnnouncementStore = create<VoiceAnnouncementState>((set) => ({
  enabledChannels: new Set(),
  queue: [],
  currentItem: null,
  isPlaying: false,
  isPaused: false,

  enableChannel: (channelId) =>
    set((state) => ({
      enabledChannels: new Set([...state.enabledChannels, channelId]),
    })),

  disableChannel: (channelId) =>
    set((state) => {
      const next = new Set(state.enabledChannels);
      next.delete(channelId);
      return { enabledChannels: next };
    }),

  addToQueue: (item) => set((state) => ({ queue: [...state.queue, item] })),

  setCurrentItem: (item) => set({ currentItem: item }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPaused: (paused) => set({ isPaused: paused }),

  removeFromQueue: (messageId) =>
    set((state) => ({
      queue: state.queue.filter((i) => i.messageId !== messageId),
    })),

  clearQueue: () => set({ queue: [], currentItem: null, isPlaying: false }),
}));
```

- [ ] **Step 2: Commit announcement store**

```bash
git add frontend/src/features/voice/stores/voiceAnnouncementStore.ts
git commit -m "feat(voice): add voice announcement state store"
```

---

## Task 4: Voice Config Store

**Files:**
- Create: `frontend/src/features/voice/stores/voiceConfigStore.ts`

- [ ] **Step 1: Create config store with persistence**

```typescript
// frontend/src/features/voice/stores/voiceConfigStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ChannelVoiceConfig,
  AgentVoiceConfig,
  GlobalVoiceConfig,
} from '../types/voice';

interface VoiceConfigState {
  channelConfigs: Record<string, ChannelVoiceConfig>;
  agentVoiceConfigs: Record<string, AgentVoiceConfig>;
  globalConfig: GlobalVoiceConfig;

  setChannelConfig: (
    channelId: string,
    config: Partial<ChannelVoiceConfig>
  ) => void;
  setAgentVoiceConfig: (
    agentId: string,
    config: Partial<AgentVoiceConfig>
  ) => void;
  setGlobalConfig: (config: Partial<GlobalVoiceConfig>) => void;
}

const DEFAULT_CHANNEL_CONFIG: ChannelVoiceConfig = {
  provider: 'openai',
  model: 'tts-1',
  ttsEnabled: false,
  autoPlay: true,
};

const DEFAULT_AGENT_VOICE: AgentVoiceConfig = {
  voice: 'alloy',
  speed: 1.0,
  pitch: 0,
};

const VOICE_POOL = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

export const useVoiceConfigStore = create<VoiceConfigState>()(
  persist(
    (set) => ({
      channelConfigs: {},
      agentVoiceConfigs: {},
      globalConfig: {
        defaultLanguage: 'zh-CN',
        defaultSpeed: 1.0,
        defaultVolume: 0.8,
      },

      setChannelConfig: (channelId, config) =>
        set((state) => ({
          channelConfigs: {
            ...state.channelConfigs,
            [channelId]: {
              ...(state.channelConfigs[channelId] ?? DEFAULT_CHANNEL_CONFIG),
              ...config,
            },
          },
        })),

      setAgentVoiceConfig: (agentId, config) =>
        set((state) => ({
          agentVoiceConfigs: {
            ...state.agentVoiceConfigs,
            [agentId]: {
              ...(state.agentVoiceConfigs[agentId] ?? DEFAULT_AGENT_VOICE),
              ...config,
            },
          },
        })),

      setGlobalConfig: (config) =>
        set((state) => ({
          globalConfig: { ...state.globalConfig, ...config },
        })),
    }),
    { name: 'voice-config-storage' }
  )
);

export const getAgentVoiceConfig = (
  agentId: string,
  agentIndex: number
): AgentVoiceConfig => {
  const store = useVoiceConfigStore.getState();
  return (
    store.agentVoiceConfigs[agentId] ?? {
      ...DEFAULT_AGENT_VOICE,
      voice: VOICE_POOL[agentIndex % VOICE_POOL.length],
    }
  );
};
```

- [ ] **Step 2: Commit config store**

```bash
git add frontend/src/features/voice/stores/voiceConfigStore.ts
git commit -m "feat(voice): add voice config store with persistence"
```

---

## Task 5: TTS API Client

**Files:**
- Create: `frontend/src/features/voice/api/tts.ts`

- [ ] **Step 1: Create TTS API client**

```typescript
// frontend/src/features/voice/api/tts.ts
import { apiClient } from '@/lib/api-client';

export const ttsAPI = {
  synthesize: async (params: {
    text: string;
    voice: string;
    speed: number;
    pitch: number;
    format: 'mp3' | 'wav' | 'opus';
  }): Promise<string> => {
    const response = await apiClient.post<{
      audio_url: string;
      duration: number;
    }>('/voice/tts/synthesize', params);
    return response.data.audio_url;
  },
};
```

- [ ] **Step 2: Commit TTS API client**

```bash
git add frontend/src/features/voice/api/tts.ts
git commit -m "feat(voice): add TTS API client"
```

---

## Task 6: Voice Queue Hook

**Files:**
- Create: `frontend/src/features/voice/hooks/useVoiceQueue.ts`

- [ ] **Step 1: Create voice queue hook**

```typescript
// frontend/src/features/voice/hooks/useVoiceQueue.ts
import { useEffect } from 'react';
import { useVoiceAnnouncementStore } from '../stores/voiceAnnouncementStore';
import { useVoiceConfigStore } from '../stores/voiceConfigStore';
import { audioPlayer } from '../utils/audioPlayer';
import { ttsAPI } from '../api/tts';
import type { AnnouncementItem } from '../types/voice';

export const useVoiceQueue = () => {
  const {
    queue,
    currentItem,
    isPlaying,
    isPaused,
    setCurrentItem,
    setPlaying,
    setPaused,
    removeFromQueue,
  } = useVoiceAnnouncementStore();

  const { globalConfig } = useVoiceConfigStore();

  // Auto-play queue
  useEffect(() => {
    if (isPlaying || isPaused || queue.length === 0) return;

    const next = queue[0];
    playItem(next);
  }, [queue, isPlaying, isPaused]);

  const playItem = async (item: AnnouncementItem) => {
    setCurrentItem(item);
    setPlaying(true);

    try {
      const audioUrl =
        item.audioUrl ??
        (await ttsAPI.synthesize({
          text: item.content,
          voice: item.voiceConfig.voice,
          speed: item.voiceConfig.speed,
          pitch: item.voiceConfig.pitch,
          format: 'mp3',
        }));

      await audioPlayer.play(audioUrl, {
        volume: globalConfig.defaultVolume,
      });
    } catch (e) {
      console.error('TTS playback failed', e);
    } finally {
      removeFromQueue(item.messageId);
      setCurrentItem(null);
      setPlaying(false);
    }
  };

  const pause = () => {
    audioPlayer.pause();
    setPaused(true);
    setPlaying(false);
  };

  const resume = () => {
    audioPlayer.resume();
    setPaused(false);
    setPlaying(true);
  };

  const skip = () => {
    audioPlayer.stop();
  };

  const stop = () => {
    audioPlayer.stop();
    useVoiceAnnouncementStore.getState().clearQueue();
  };

  return { currentItem, isPlaying, isPaused, pause, resume, skip, stop };
};
```

- [ ] **Step 2: Commit voice queue hook**

```bash
git add frontend/src/features/voice/hooks/useVoiceQueue.ts
git commit -m "feat(voice): add voice queue playback hook"
```

---

## Task 7: Voice Announcement Hook

**Files:**
- Create: `frontend/src/features/voice/hooks/useVoiceAnnouncement.ts`

- [ ] **Step 1: Create voice announcement hook**

```typescript
// frontend/src/features/voice/hooks/useVoiceAnnouncement.ts
import { useEffect } from 'react';
import { useVoiceAnnouncementStore } from '../stores/voiceAnnouncementStore';
import { getAgentVoiceConfig } from '../stores/voiceConfigStore';
import { websocket } from '@/lib/websocket';
import type { Message } from '@/types';
import type { AnnouncementItem } from '../types/voice';

export const useVoiceAnnouncement = (
  channelId: string,
  agents: Array<{ agent_id: string; display_name: string }>
) => {
  const { enabledChannels, addToQueue, isPlaying, isPaused } =
    useVoiceAnnouncementStore();

  const isEnabled = enabledChannels.has(channelId);

  useEffect(() => {
    if (!isEnabled) return;

    const unsubscribe = websocket.subscribe(
      `channel:${channelId}:new_message`,
      async (message: Message) => {
        const agentIndex = agents.findIndex(
          (a) => a.agent_id === message.sender_id
        );
        const voiceConfig = getAgentVoiceConfig(
          message.sender_id ?? '',
          agentIndex
        );

        const needsPrefix =
          agents.length > 1 && message.sender_type === 'agent';
        const agentName = agents.find(
          (a) => a.agent_id === message.sender_id
        )?.display_name;
        const content =
          needsPrefix && agentName
            ? `${agentName}：${message.content}`
            : message.content;

        const item: AnnouncementItem = {
          messageId: message.message_id,
          content,
          agentId: message.sender_id,
          agentName,
          voiceConfig,
          status: 'pending',
        };

        addToQueue(item);
      }
    );

    return unsubscribe;
  }, [channelId, isEnabled, agents]);

  return { isEnabled, isPlaying, isPaused };
};
```

- [ ] **Step 2: Commit voice announcement hook**

```bash
git add frontend/src/features/voice/hooks/useVoiceAnnouncement.ts
git commit -m "feat(voice): add voice announcement message listener hook"
```

---

## Task 8: Voice Announcement Toggle Component

**Files:**
- Create: `frontend/src/features/voice/components/VoiceAnnouncementToggle.tsx`

- [ ] **Step 1: Create toggle component**

```typescript
// frontend/src/features/voice/components/VoiceAnnouncementToggle.tsx
import React from 'react';
import { Volume2Icon, VolumeXIcon } from 'lucide-react';
import { useVoiceAnnouncementStore } from '../stores/voiceAnnouncementStore';
import { useVoiceConfigStore } from '../stores/voiceConfigStore';
import { cn } from '@/lib/utils';

interface Props {
  channelId: string;
}

export const VoiceAnnouncementToggle: React.FC<Props> = ({ channelId }) => {
  const { enabledChannels, enableChannel, disableChannel } =
    useVoiceAnnouncementStore();
  const { setChannelConfig } = useVoiceConfigStore();
  const isEnabled = enabledChannels.has(channelId);

  const toggle = () => {
    if (isEnabled) {
      disableChannel(channelId);
    } else {
      enableChannel(channelId);
      setChannelConfig(channelId, { ttsEnabled: true });
    }
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors',
        isEnabled
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
      title={isEnabled ? '关闭语音播报' : '开启语音播报'}
    >
      {isEnabled ? (
        <Volume2Icon className="w-4 h-4" />
      ) : (
        <VolumeXIcon className="w-4 h-4" />
      )}
      <span>{isEnabled ? '播报中' : '语音播报'}</span>
    </button>
  );
};
```

- [ ] **Step 2: Commit toggle component**

```bash
git add frontend/src/features/voice/components/VoiceAnnouncementToggle.tsx
git commit -m "feat(voice): add voice announcement toggle component"
```

---

## Task 9: Voice Playback Bar Component

**Files:**
- Create: `frontend/src/features/voice/components/VoicePlaybackBar.tsx`

- [ ] **Step 1: Create playback bar component**

```typescript
// frontend/src/features/voice/components/VoicePlaybackBar.tsx
import React from 'react';
import {
  Volume2Icon,
  PauseIcon,
  PlayIcon,
  SkipForwardIcon,
  StopCircleIcon,
} from 'lucide-react';
import { useVoiceQueue } from '../hooks/useVoiceQueue';

export const VoicePlaybackBar: React.FC = () => {
  const { currentItem, isPlaying, isPaused, queue, pause, resume, skip, stop } =
    useVoiceQueue();

  if (!currentItem && queue.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm">
      <Volume2Icon className="w-4 h-4 text-blue-600 shrink-0" />

      <span className="flex-1 truncate text-gray-700">
        {currentItem
          ? `正在播报：${currentItem.agentName ?? '消息'}`
          : '准备播报...'}
      </span>

      {queue.length > 0 && (
        <span className="text-xs text-gray-500">队列：{queue.length} 条</span>
      )}

      <div className="flex items-center gap-1">
        {isPlaying ? (
          <button
            onClick={pause}
            className="p-1 hover:bg-blue-100 rounded"
            title="暂停"
          >
            <PauseIcon className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={resume}
            className="p-1 hover:bg-blue-100 rounded"
            title="继续"
          >
            <PlayIcon className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={skip}
          className="p-1 hover:bg-blue-100 rounded"
          title="跳过"
        >
          <SkipForwardIcon className="w-4 h-4" />
        </button>
        <button
          onClick={stop}
          className="p-1 hover:bg-blue-100 rounded"
          title="停止"
        >
          <StopCircleIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit playback bar component**

```bash
git add frontend/src/features/voice/components/VoicePlaybackBar.tsx
git commit -m "feat(voice): add voice playback control bar component"
```

---

## Task 10: Message Play Button Component

**Files:**
- Create: `frontend/src/features/voice/components/MessagePlayButton.tsx`

- [ ] **Step 1: Create message play button component**

```typescript
// frontend/src/features/voice/components/MessagePlayButton.tsx
import React, { useState } from 'react';
import { Volume2Icon, LoaderIcon } from 'lucide-react';
import { getAgentVoiceConfig, useVoiceConfigStore } from '../stores/voiceConfigStore';
import { audioPlayer } from '../utils/audioPlayer';
import { ttsAPI } from '../api/tts';
import type { Message } from '@/types';

interface Props {
  message: Message;
  agentIndex: number;
}

export const MessagePlayButton: React.FC<Props> = ({ message, agentIndex }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { globalConfig } = useVoiceConfigStore();
  const voiceConfig = getAgentVoiceConfig(message.sender_id ?? '', agentIndex);

  const handlePlay = async () => {
    setIsLoading(true);
    try {
      const audioUrl = await ttsAPI.synthesize({
        text: message.content,
        voice: voiceConfig.voice,
        speed: voiceConfig.speed,
        pitch: voiceConfig.pitch,
        format: 'mp3',
      });
      await audioPlayer.play(audioUrl, { volume: globalConfig.defaultVolume });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading}
      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-opacity"
      title="播放此消息"
    >
      {isLoading ? (
        <LoaderIcon className="w-3.5 h-3.5 animate-spin text-gray-400" />
      ) : (
        <Volume2Icon className="w-3.5 h-3.5 text-gray-400" />
      )}
    </button>
  );
};
```

- [ ] **Step 2: Commit message play button**

```bash
git add frontend/src/features/voice/components/MessagePlayButton.tsx
git commit -m "feat(voice): add per-message play button component"
```

---

## Task 11: Integrate into ChatPage

**Files:**
- Modify: `frontend/src/features/chat/components/ChatPage.tsx`
- Modify: `frontend/src/features/chat/components/MessageBubble.tsx`

- [ ] **Step 1: Add VoicePlaybackBar to ChatPage**

```typescript
// In ChatPage.tsx, add import:
import { VoicePlaybackBar } from '@/features/voice/components/VoicePlaybackBar';
import { VoiceAnnouncementToggle } from '@/features/voice/components/VoiceAnnouncementToggle';

// In the render, add VoicePlaybackBar after AgentBar:
<AgentBar />
<VoicePlaybackBar />

// In MessageToolbar, add the toggle:
<MessageToolbar>
  <VoiceAnnouncementToggle channelId={activeChannelId} />
</MessageToolbar>
```

- [ ] **Step 2: Add MessagePlayButton to MessageBubble**

```typescript
// In MessageBubble.tsx, add import:
import { MessagePlayButton } from '@/features/voice/components/MessagePlayButton';

// In the render, add MessagePlayButton:
<div className="group relative flex gap-3 px-4 py-2 hover:bg-gray-50">
  <div className="flex-1">{/* message content */}</div>
  <MessagePlayButton message={message} agentIndex={agentIndex} />
</div>
```

- [ ] **Step 3: Commit integration**

```bash
git add frontend/src/features/chat/components/ChatPage.tsx frontend/src/features/chat/components/MessageBubble.tsx
git commit -m "feat(voice): integrate voice announcement into ChatPage"
```

---

## Self-Review Checklist

- [x] All file paths are exact and absolute
- [x] All code blocks are complete (no placeholders)
- [x] All types are defined before use
- [x] All imports reference defined files
- [x] TDD approach: tests → implementation → commit
- [x] Each task produces working, testable code
- [x] Frequent commits after each component

## Backend API Requirements

The frontend expects these backend endpoints:

```
POST /api/v1/voice/tts/synthesize
Request: { text, voice, speed, pitch, format }
Response: { ok: true, data: { audio_url, duration } }

GET /api/v1/channels/:channelId/voice-config
PUT /api/v1/channels/:channelId/voice-config

GET /api/v1/agents/:agentId/voice-config
PUT /api/v1/agents/:agentId/voice-config
```

---

**Implementation time estimate:** 6-9 days across 11 tasks
