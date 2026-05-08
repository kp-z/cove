# 语音播报模式设计（Voice Announcement Mode）

> **版本**: v4.0  
> **日期**: 2026-05-08  
> **关键词**: `TTS`, `语音播报`, `播报队列`, `多Agent声音区分`, `音色配置`, `Channel配置`

**本文档包含**:
- 语音播报模式的前端架构设计
- TTS 播报队列管理
- 多 Agent 声音区分策略
- 语音配置管理（Channel 级别 + Agent 级别）
- 后端 API 需求

**适用场景**:
- 实现 Channel 语音播报功能
- 配置 Agent 音色
- 管理播报队列和控制

**相关文档**:
- [Presentation Layer](./frontend-layer.md) - 前端架构设计
- [Feature Domain Organization](./05-feature-domain-organization.md) - 功能域组织规范

---

## 1. 功能概述

语音播报模式是 Chat 组件的可选增强功能，允许用户将 Channel 中的消息自动转换为语音播报。

**核心特性**：
- **Channel 级别开关**：每个 Channel 独立配置，互不影响
- **自动播报队列**：新消息到达时自动加入队列，顺序播报
- **多 Agent 声音区分**：不同 Agent 使用不同音色，首次播报时说名字
- **播报控制**：支持暂停、跳过、停止
- **历史消息播放**：每条消息旁提供手动播放按钮
- **共享语音模型**：TTS 模型在 Channel 级别统一配置

**不包含**：
- ~~STT 语音输入~~（后续版本）
- ~~实时语音流~~（后续版本）

---

## 2. 架构设计

### 2.1 功能域组织

```
frontend/src/
├── features/
│   ├── voice/                              # 语音播报功能域
│   │   ├── components/
│   │   │   ├── VoiceAnnouncementToggle.tsx  # Channel 播报开关
│   │   │   ├── VoicePlaybackBar.tsx         # 播报控制条
│   │   │   ├── VoiceConfigPanel.tsx         # 语音配置面板
│   │   │   ├── AgentVoiceSelector.tsx       # Agent 音色选择器
│   │   │   └── MessagePlayButton.tsx        # 单条消息播放按钮
│   │   ├── hooks/
│   │   │   ├── useVoiceAnnouncement.ts      # 播报逻辑（监听消息、触发播报）
│   │   │   ├── useVoiceConfig.ts            # 配置读写
│   │   │   └── useVoiceQueue.ts             # 队列操作
│   │   ├── stores/
│   │   │   ├── voiceAnnouncementStore.ts    # 播报状态（队列、播放状态）
│   │   │   └── voiceConfigStore.ts          # 配置状态（Channel、Agent、全局）
│   │   ├── api/
│   │   │   └── tts.ts                       # TTS API 调用
│   │   ├── types/
│   │   │   └── voice.ts                     # 类型定义
│   │   └── utils/
│   │       ├── audioPlayer.ts               # 音频播放器（单例）
│   │       └── voiceQueue.ts                # 队列工具函数
│   │
│   └── chat/
│       └── components/
│           └── MessageBubble.tsx            # 修改：集成 MessagePlayButton
```

### 2.2 数据流

```
新消息到达（WebSocket）
        ↓
useVoiceAnnouncement 监听
        ↓
Channel 是否开启播报？
   ↓ 是              ↓ 否
prepareAnnouncement   忽略
（获取音色配置、调用 TTS API）
        ↓
加入 voiceAnnouncementStore.queue
        ↓
audioPlayer 顺序播放
        ↓
播放完成 → 取下一条
```

---

## 3. 类型定义

```typescript
// features/voice/types/voice.ts

export interface AnnouncementItem {
  messageId: string;
  content: string;           // 播报文本（可能包含名字前缀）
  agentId?: string;
  agentName?: string;
  voiceConfig: AgentVoiceConfig;
  audioUrl?: string;         // TTS 生成的音频 URL（预生成后填入）
  status: 'pending' | 'loading' | 'ready' | 'playing' | 'done' | 'error';
}

export interface ChannelVoiceConfig {
  provider: 'openai' | 'azure' | 'elevenlabs';
  model: string;             // 例如 'tts-1', 'tts-1-hd'
  ttsEnabled: boolean;
  autoPlay: boolean;
}

export interface AgentVoiceConfig {
  voice: string;             // 音色 ID，例如 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed: number;             // 0.25-4.0，默认 1.0
  pitch: number;             // -20 到 20，默认 0
}

export interface GlobalVoiceConfig {
  defaultLanguage: string;   // 默认 'zh-CN'
  defaultSpeed: number;      // 默认 1.0
  defaultVolume: number;     // 0-1，默认 0.8
}
```

---

## 4. 状态管理

### 4.1 播报状态（voiceAnnouncementStore）

```typescript
// features/voice/stores/voiceAnnouncementStore.ts
import { create } from 'zustand';

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
    set((state) => ({ enabledChannels: new Set([...state.enabledChannels, channelId]) })),

  disableChannel: (channelId) =>
    set((state) => {
      const next = new Set(state.enabledChannels);
      next.delete(channelId);
      return { enabledChannels: next };
    }),

  addToQueue: (item) =>
    set((state) => ({ queue: [...state.queue, item] })),

  setCurrentItem: (item) => set({ currentItem: item }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPaused: (paused) => set({ isPaused: paused }),

  removeFromQueue: (messageId) =>
    set((state) => ({ queue: state.queue.filter((i) => i.messageId !== messageId) })),

  clearQueue: () => set({ queue: [], currentItem: null, isPlaying: false }),
}));
```

### 4.2 配置状态（voiceConfigStore）

```typescript
// features/voice/stores/voiceConfigStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VoiceConfigState {
  channelConfigs: Record<string, ChannelVoiceConfig>;
  agentVoiceConfigs: Record<string, AgentVoiceConfig>;
  globalConfig: GlobalVoiceConfig;

  setChannelConfig: (channelId: string, config: Partial<ChannelVoiceConfig>) => void;
  setAgentVoiceConfig: (agentId: string, config: Partial<AgentVoiceConfig>) => void;
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

// 预设音色池，按顺序分配给 Agent
const VOICE_POOL = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

export const useVoiceConfigStore = create<VoiceConfigState>()(
  persist(
    (set, get) => ({
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
            [channelId]: { ...(state.channelConfigs[channelId] ?? DEFAULT_CHANNEL_CONFIG), ...config },
          },
        })),

      setAgentVoiceConfig: (agentId, config) =>
        set((state) => ({
          agentVoiceConfigs: {
            ...state.agentVoiceConfigs,
            [agentId]: { ...(state.agentVoiceConfigs[agentId] ?? DEFAULT_AGENT_VOICE), ...config },
          },
        })),

      setGlobalConfig: (config) =>
        set((state) => ({ globalConfig: { ...state.globalConfig, ...config } })),
    }),
    { name: 'voice-config-storage' }
  )
);

// 获取 Agent 音色（自动分配或使用已配置的）
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

---

## 5. 核心 Hooks

### 5.1 useVoiceAnnouncement

```typescript
// features/voice/hooks/useVoiceAnnouncement.ts
export const useVoiceAnnouncement = (channelId: string) => {
  const { enabledChannels, addToQueue, isPlaying, isPaused, clearQueue } =
    useVoiceAnnouncementStore();
  const { channelConfigs } = useVoiceConfigStore();
  const { agents } = useChannelAgents(channelId);

  const isEnabled = enabledChannels.has(channelId);
  const channelConfig = channelConfigs[channelId];

  // 监听新消息，加入播报队列
  useEffect(() => {
    if (!isEnabled) return;

    const unsubscribe = websocket.subscribe(
      `channel:${channelId}:new_message`,
      async (message: Message) => {
        const agentIndex = agents.findIndex((a) => a.agent_id === message.sender_id);
        const voiceConfig = getAgentVoiceConfig(message.sender_id ?? '', agentIndex);

        // 多 Agent 时添加名字前缀（首次播报）
        const needsPrefix =
          agents.length > 1 && message.sender_type === 'agent';
        const agentName = agents.find((a) => a.agent_id === message.sender_id)?.display_name;
        const content =
          needsPrefix && agentName ? `${agentName}：${message.content}` : message.content;

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

### 5.2 useVoiceQueue（队列播放控制）

```typescript
// features/voice/hooks/useVoiceQueue.ts
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
  const player = audioPlayer; // 单例

  // 队列驱动：当队列有内容且未在播放时，自动开始
  useEffect(() => {
    if (isPlaying || isPaused || queue.length === 0) return;

    const next = queue[0];
    playItem(next);
  }, [queue, isPlaying, isPaused]);

  const playItem = async (item: AnnouncementItem) => {
    setCurrentItem(item);
    setPlaying(true);

    try {
      // 如果没有预生成的 audioUrl，调用 TTS API
      const audioUrl = item.audioUrl ?? (await ttsAPI.synthesize({
        text: item.content,
        voice: item.voiceConfig.voice,
        speed: item.voiceConfig.speed,
        pitch: item.voiceConfig.pitch,
        format: 'mp3',
      }));

      await player.play(audioUrl, { volume: globalConfig.defaultVolume });
    } catch (e) {
      console.error('TTS playback failed', e);
    } finally {
      removeFromQueue(item.messageId);
      setCurrentItem(null);
      setPlaying(false);
    }
  };

  const pause = () => { player.pause(); setPaused(true); setPlaying(false); };
  const resume = () => { player.resume(); setPaused(false); setPlaying(true); };
  const skip = () => { player.stop(); };
  const stop = () => { player.stop(); useVoiceAnnouncementStore.getState().clearQueue(); };

  return { currentItem, isPlaying, isPaused, pause, resume, skip, stop };
};
```

---

## 6. UI 组件

### 6.1 VoiceAnnouncementToggle（Channel 开关）

```typescript
// features/voice/components/VoiceAnnouncementToggle.tsx
export const VoiceAnnouncementToggle: React.FC<{ channelId: string }> = ({ channelId }) => {
  const { enabledChannels, enableChannel, disableChannel } = useVoiceAnnouncementStore();
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
      {isEnabled ? <Volume2Icon className="w-4 h-4" /> : <VolumeXIcon className="w-4 h-4" />}
      <span>{isEnabled ? '播报中' : '语音播报'}</span>
    </button>
  );
};
```

### 6.2 VoicePlaybackBar（播报控制条）

```typescript
// features/voice/components/VoicePlaybackBar.tsx
export const VoicePlaybackBar: React.FC = () => {
  const { currentItem, isPlaying, isPaused, queue, pause, resume, skip, stop } = useVoiceQueue();

  if (!currentItem && queue.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm">
      <Volume2Icon className="w-4 h-4 text-blue-600 shrink-0" />

      <span className="flex-1 truncate text-gray-700">
        {currentItem
          ? `正在播报：${currentItem.agentName ? `${currentItem.agentName}` : '消息'}`
          : '准备播报...'}
      </span>

      {queue.length > 0 && (
        <span className="text-xs text-gray-500">队列：{queue.length} 条</span>
      )}

      <div className="flex items-center gap-1">
        {isPlaying ? (
          <button onClick={pause} className="p-1 hover:bg-blue-100 rounded" title="暂停">
            <PauseIcon className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={resume} className="p-1 hover:bg-blue-100 rounded" title="继续">
            <PlayIcon className="w-4 h-4" />
          </button>
        )}
        <button onClick={skip} className="p-1 hover:bg-blue-100 rounded" title="跳过">
          <SkipForwardIcon className="w-4 h-4" />
        </button>
        <button onClick={stop} className="p-1 hover:bg-blue-100 rounded" title="停止">
          <StopCircleIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
```

### 6.3 MessagePlayButton（单条消息播放）

```typescript
// features/voice/components/MessagePlayButton.tsx
export const MessagePlayButton: React.FC<{ message: Message; agentIndex: number }> = ({
  message,
  agentIndex,
}) => {
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

### 6.4 集成到 ChatPage

```typescript
// 在 ChatPage 中集成
export const ChatPage: React.FC = () => {
  const { activeChannelId } = useChannelStore();

  return (
    <div className="flex h-screen">
      <ChannelSidebar />
      <div className="flex-1 flex flex-col">
        <ChannelTabs />
        <AgentBar />

        {/* 播报控制条（有播报时显示） */}
        <VoicePlaybackBar />

        <MessageTimeline />

        {/* 工具栏右侧添加播报开关 */}
        <MessageToolbar>
          <VoiceAnnouncementToggle channelId={activeChannelId} />
        </MessageToolbar>
      </div>
      <DetailPanel />
    </div>
  );
};

// MessageBubble 集成播放按钮
export const MessageBubble: React.FC<{ message: Message; agentIndex: number }> = ({
  message,
  agentIndex,
}) => {
  return (
    <div className="group relative flex gap-3 px-4 py-2 hover:bg-gray-50">
      {/* 消息内容 */}
      <div className="flex-1">{/* ... */}</div>

      {/* 播放按钮（hover 显示） */}
      <MessagePlayButton message={message} agentIndex={agentIndex} />
    </div>
  );
};
```

---

## 7. 工具函数

### 7.1 audioPlayer（单例音频播放器）

```typescript
// features/voice/utils/audioPlayer.ts
class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private resolvePlay: (() => void) | null = null;

  async play(url: string, options: { volume?: number } = {}): Promise<void> {
    this.stop();

    return new Promise((resolve) => {
      this.resolvePlay = resolve;
      this.audio = new Audio(url);
      this.audio.volume = options.volume ?? 0.8;
      this.audio.onended = () => { this.resolvePlay?.(); this.resolvePlay = null; };
      this.audio.onerror = () => { this.resolvePlay?.(); this.resolvePlay = null; };
      this.audio.play();
    });
  }

  pause() { this.audio?.pause(); }
  resume() { this.audio?.play(); }
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

### 7.2 TTS API 调用

```typescript
// features/voice/api/tts.ts
export const ttsAPI = {
  synthesize: async (params: {
    text: string;
    voice: string;
    speed: number;
    pitch: number;
    format: 'mp3' | 'wav' | 'opus';
  }): Promise<string> => {
    const response = await apiClient.post<{ audio_url: string; duration: number }>(
      '/voice/tts/synthesize',
      params
    );
    return response.data.audio_url;
  },
};
```

---

## 8. 后端 API 需求

### 8.1 TTS 合成

```
POST /api/v1/voice/tts/synthesize

Request:
{
  "text": string,           // 播报文本
  "voice": string,          // 音色 ID（openai: alloy/echo/fable/onyx/nova/shimmer）
  "speed": number,          // 0.25-4.0
  "pitch": number,          // -20 到 20（如果模型支持）
  "format": "mp3" | "wav" | "opus"
}

Response:
{
  "ok": true,
  "data": {
    "audio_url": string,    // 音频文件 URL（临时 URL，有效期 1 小时）
    "duration": number      // 时长（秒）
  }
}
```

### 8.2 Channel 语音配置

```
GET  /api/v1/channels/:channelId/voice-config
PUT  /api/v1/channels/:channelId/voice-config

Request (PUT):
{
  "provider": "openai" | "azure" | "elevenlabs",
  "model": string,
  "tts_enabled": boolean,
  "auto_play": boolean
}
```

### 8.3 Agent 音色配置

```
GET  /api/v1/agents/:agentId/voice-config
PUT  /api/v1/agents/:agentId/voice-config

Request (PUT):
{
  "voice": string,
  "speed": number,
  "pitch": number
}
```

---

## 9. 实施计划

### Phase 1: TTS 基础（3-4 天）
- [ ] 定义类型（`voice.ts`）
- [ ] 实现 `voiceAnnouncementStore` 和 `voiceConfigStore`
- [ ] 实现 `audioPlayer` 单例
- [ ] 实现 `ttsAPI.synthesize`
- [ ] 实现 `useVoiceQueue`（队列播放控制）
- [ ] 实现 `VoicePlaybackBar` 组件
- [ ] 实现 `VoiceAnnouncementToggle` 组件
- [ ] 集成到 `ChatPage`

### Phase 2: 多 Agent 支持（2-3 天）
- [ ] 实现 `getAgentVoiceConfig`（自动分配音色）
- [ ] 实现 `useVoiceAnnouncement`（监听消息、名字前缀逻辑）
- [ ] 实现 `AgentVoiceSelector` 组件
- [ ] 实现 `VoiceConfigPanel` 组件
- [ ] 集成到 Channel 设置面板

### Phase 3: 历史消息播放（1-2 天）
- [ ] 实现 `MessagePlayButton` 组件
- [ ] 集成到 `MessageBubble`

**总工作量**：6-9 天
