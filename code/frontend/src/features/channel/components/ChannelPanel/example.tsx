/**
 * ChannelPanel 使用示例
 *
 * 展示如何在应用中集成和使用 ChannelPanel 组件
 */

import React, { useState } from 'react';
import { ChannelPanel } from './index';

/**
 * 示例 1: 基础使用
 *
 * 最简单的使用方式，只需要提供 channelId
 */
export function BasicExample() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        打开 Channel Panel
      </button>
    );
  }

  return (
    <div className="w-full h-screen">
      <ChannelPanel
        channelId="your-channel-id"
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

/**
 * 示例 2: 打开特定 Thread
 *
 * 可以指定初始打开的 threadId
 */
export function ThreadExample() {
  return (
    <div className="w-full h-screen">
      <ChannelPanel
        channelId="your-channel-id"
        threadId="specific-thread-id"
        onClose={() => console.log('Panel closed')}
      />
    </div>
  );
}

/**
 * 示例 3: 侧边栏模式
 *
 * 作为侧边栏使用，固定宽度
 */
export function SidebarExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* 主内容区 */}
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-4">主内容区</h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {isOpen ? '关闭' : '打开'} Channel Panel
        </button>
      </div>

      {/* Channel Panel 侧边栏 */}
      {isOpen && (
        <div className="w-96 border-l border-gray-200 dark:border-gray-700">
          <ChannelPanel
            channelId="your-channel-id"
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 示例 4: 模态框模式
 *
 * 作为模态框使用，覆盖在主内容之上
 */
export function ModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">主内容区</h1>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        打开 Channel Panel
      </button>

      {/* 模态框遮罩 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-[800px] h-[600px] rounded-lg overflow-hidden shadow-2xl">
            <ChannelPanel
              channelId="your-channel-id"
              onClose={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 示例 5: 多 Channel 切换
 *
 * 支持在多个 Channel 之间切换
 */
export function MultiChannelExample() {
  const [activeChannelId, setActiveChannelId] = useState('channel-1');

  const channels = [
    { id: 'channel-1', name: 'General' },
    { id: 'channel-2', name: 'Development' },
    { id: 'channel-3', name: 'Design' },
  ];

  return (
    <div className="flex h-screen">
      {/* Channel 列表 */}
      <div className="w-64 bg-gray-100 dark:bg-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Channels
        </h2>
        <div className="space-y-2">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannelId(channel.id)}
              className={`w-full text-left px-4 py-2 rounded transition-colors ${
                activeChannelId === channel.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {channel.name}
            </button>
          ))}
        </div>
      </div>

      {/* Channel Panel */}
      <div className="flex-1">
        <ChannelPanel
          key={activeChannelId} // 使用 key 强制重新渲染
          channelId={activeChannelId}
          onClose={() => console.log('Panel closed')}
        />
      </div>
    </div>
  );
}

/**
 * 示例 6: 完整应用集成
 *
 * 展示如何在完整应用中集成 ChannelPanel
 */
export function FullAppExample() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 左侧导航栏 */}
      <div className="w-16 bg-gray-800 flex flex-col items-center py-4 space-y-4">
        <button className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
          <span className="text-white text-xl">🏠</span>
        </button>
        <button
          onClick={() => setSelectedChannel('channel-1')}
          className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          <span className="text-white text-xl">💬</span>
        </button>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex">
        {/* 内容区域 */}
        <div className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            欢迎使用 Cove
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            点击左侧的聊天图标打开 Channel Panel
          </p>
        </div>

        {/* Channel Panel 侧边栏 */}
        {selectedChannel && (
          <div className="w-[500px] border-l border-gray-200 dark:border-gray-700">
            <ChannelPanel
              channelId={selectedChannel}
              onClose={() => setSelectedChannel(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 默认导出：展示所有示例
 */
export default function ExamplesPage() {
  const [activeExample, setActiveExample] = useState<string>('basic');

  const examples = [
    { id: 'basic', name: '基础使用', component: BasicExample },
    { id: 'thread', name: '打开特定 Thread', component: ThreadExample },
    { id: 'sidebar', name: '侧边栏模式', component: SidebarExample },
    { id: 'modal', name: '模态框模式', component: ModalExample },
    { id: 'multi', name: '多 Channel 切换', component: MultiChannelExample },
    { id: 'full', name: '完整应用集成', component: FullAppExample },
  ];

  const ActiveComponent = examples.find((ex) => ex.id === activeExample)?.component || BasicExample;

  return (
    <div className="h-screen flex flex-col">
      {/* 示例选择器 */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">
          ChannelPanel 使用示例
        </h1>
        <div className="flex gap-2 flex-wrap">
          {examples.map((example) => (
            <button
              key={example.id}
              onClick={() => setActiveExample(example.id)}
              className={`px-4 py-2 rounded transition-colors ${
                activeExample === example.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {example.name}
            </button>
          ))}
        </div>
      </div>

      {/* 示例展示区 */}
      <div className="flex-1 overflow-hidden">
        <ActiveComponent />
      </div>
    </div>
  );
}
