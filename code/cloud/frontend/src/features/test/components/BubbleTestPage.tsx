import { useState } from 'react';
import { BubbleGroup } from '@/shared/components/ui/BubbleGroup';
import type { BubbleItem } from '@/shared/components/ui/BubbleGroup';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { GlassCard } from '@/shared/components/ui/cards/GlassCard';

export default function BubbleTestPage() {
  const [variant, setVariant] = useState<'compact' | 'comfortable'>('compact');
  const [clickedId, setClickedId] = useState<string | null>(null);

  const compactItems: BubbleItem[] = [
    {
      id: '1',
      label: 'Sonnet 4.6',
      state: 'active',
      progress: 75,
      capsule: { text: 'Current', variant: 'info' },
      tooltip: (
        <div className="bg-black/95 rounded-lg px-3 py-2 text-[10px] text-white shadow-lg border border-white/10">
          <div className="font-bold mb-1">Sonnet 4.6</div>
          <div className="text-gray-300 mb-2">50,000 / 200,000 tokens</div>
          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400" style={{ width: '75%' }} />
          </div>
          <div className="text-[8px] text-gray-400 mt-1">75% Used</div>
        </div>
      ),
    },
    {
      id: '2',
      label: 'Opus 4.7',
      state: 'available',
      progress: 30,
      capsule: { text: 'Available', variant: 'success' },
      tooltip: (
        <div className="bg-black/95 rounded-lg px-3 py-2 text-[10px] text-white shadow-lg border border-white/10">
          <div className="font-bold mb-1">Opus 4.7</div>
          <div className="text-green-400 text-[8px]">Click to switch</div>
        </div>
      ),
    },
    {
      id: '3',
      label: 'Haiku 4.5',
      state: 'available',
      capsule: { text: 'Fast', variant: 'warning' },
    },
    {
      id: '4',
      label: 'GPT-4',
      state: 'disabled',
      capsule: { text: 'Offline', variant: 'error' },
      tooltip: (
        <div className="bg-black/95 rounded-lg px-3 py-2 text-[10px] text-white shadow-lg border border-white/10">
          <div className="font-bold mb-1">GPT-4</div>
          <div className="text-gray-400 text-[8px]">Not available</div>
        </div>
      ),
    },
    {
      id: '5',
      label: 'Claude 3',
      state: 'available',
      progress: 10,
      capsule: { text: 'Legacy', variant: 'default' },
    },
    {
      id: '6',
      label: 'Gemini',
      state: 'available',
      capsule: { text: 'Beta', variant: 'info' },
    },
    {
      id: '7',
      label: 'Llama 3',
      state: 'disabled',
      capsule: { text: 'Coming', variant: 'default' },
    },
    {
      id: '8',
      label: 'Mistral',
      state: 'available',
      capsule: { text: 'New', variant: 'success' },
    },
  ];

  const comfortableItems: BubbleItem[] = [
    ...compactItems,
    {
      id: '9',
      label: 'GPT-3.5',
      state: 'available',
      capsule: { text: 'Fast', variant: 'success' },
    },
    {
      id: '10',
      label: 'Claude 2',
      state: 'disabled',
      capsule: { text: 'Deprecated', variant: 'error' },
    },
    {
      id: '11',
      label: 'PaLM 2',
      state: 'available',
      capsule: { text: 'Stable', variant: 'info' },
    },
    {
      id: '12',
      label: 'Cohere',
      state: 'available',
      capsule: { text: 'Beta', variant: 'warning' },
    },
  ];

  const items = variant === 'compact' ? compactItems : comfortableItems;

  return (
    <PageShell>
      <PageHeader
        title="BubbleGroup Component Test"
        subtitle="测试气泡组件的各种状态和交互效果"
      />

      <PageContent>
        <div className="space-y-8">
          {/* Controls */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold mb-4">Controls</h2>
            <div className="flex gap-4 items-center">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Variant</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVariant('compact')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      variant === 'compact'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    Compact (8 bubbles)
                  </button>
                  <button
                    onClick={() => setVariant('comfortable')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      variant === 'comfortable'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    Comfortable (16 bubbles)
                  </button>
                </div>
              </div>
              {clickedId && (
                <div className="ml-auto">
                  <p className="text-sm text-gray-400">Last clicked:</p>
                  <p className="text-lg font-bold text-blue-400">{clickedId}</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Bubble Display */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold mb-4">Bubble Group</h2>
            <BubbleGroup
              items={items}
              variant={variant}
              onItemClick={(id) => {
                setClickedId(id);
                console.log('Clicked bubble:', id);
              }}
            />
          </GlassCard>

          {/* Legend */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold mb-4">Legend</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-400 mb-2">States</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <span>Active - 当前激活状态（蓝色发光）</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    <span>Available - 可点击切换（绿色发光）</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    <span>Disabled - 不可用（灰色）</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 mb-2">Capsule Variants</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-blue-500/90 text-white border border-blue-400/50">
                      Info
                    </span>
                    <span>信息提示</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-green-500/90 text-white border border-green-400/50">
                      Success
                    </span>
                    <span>成功状态</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-yellow-500/90 text-white border border-yellow-400/50">
                      Warning
                    </span>
                    <span>警告提示</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-red-500/90 text-white border border-red-400/50">
                      Error
                    </span>
                    <span>错误状态</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-gray-500/90 text-white border border-gray-400/50">
                      Default
                    </span>
                    <span>默认样式</span>
                  </li>
                </ul>
              </div>
            </div>
          </GlassCard>

          {/* Features */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold mb-4">Features</h2>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>✅ 浮动动画 - 每个气泡独立的浮动效果</li>
              <li>✅ 响应式设计 - 移动端和桌面端自适应</li>
              <li>✅ 水位指示器 - 可选的进度显示（0-100%）</li>
              <li>✅ 胶囊状态 - 5种颜色变体的状态标签</li>
              <li>✅ 自定义 Tooltip - 支持 ReactNode</li>
              <li>✅ 交互效果 - Hover/Active 缩放动画</li>
              <li>✅ 点击回调 - 可用状态的气泡可点击</li>
            </ul>
          </GlassCard>
        </div>
      </PageContent>
    </PageShell>
  );
}
