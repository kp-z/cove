/**
 * ClaudeCodeCLIAdapter 流式（stream-json）单元测试
 *
 * 通过 mock `child_process.spawn` 注入受控的假子进程，驱动 NDJSON 事件流，
 * 验证：
 *   1. text 块 → onContent，并以 result.result 作为最终正文
 *   2. tool_use 块 → onToolUse + onStatusChange('tool_use')
 *   3. result 事件 → onUsage（含 cost）+ onStatusChange('completed')
 *   4. 跨 data chunk 的半行能正确拼接解析
 *   5. 非法 JSON 行被跳过且不抛错
 *   6. 能力声明随 enableStreaming 切换
 *   7. enableStreaming=false 时回退批量（JSON）路径
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

/**
 * 受控的假子进程：stdout/stderr 为 EventEmitter，stdin 为可观察的桩。
 */
class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = { write: vi.fn(), end: vi.fn() };
  kill = vi.fn();
}

// 记录每次 spawn 创建的假子进程，供测试驱动事件
const childInstances: FakeChild[] = [];
const spawnMock = vi.fn((_cmd?: string, _args?: string[]) => {
  const child = new FakeChild();
  childInstances.push(child);
  return child;
});

vi.mock('child_process', () => ({
  spawn: (...args: any[]) => (spawnMock as any)(...args),
}));

// 注意：mock 之后再导入被测模块
import { ClaudeCodeCLIAdapter } from './claude-code-cli-adapter';

/**
 * 驱动假子进程：逐块 emit stdout 数据，再以指定退出码 close。
 */
function driveChild(child: FakeChild, chunks: string[], code = 0): void {
  for (const c of chunks) {
    child.stdout.emit('data', Buffer.from(c));
  }
  child.emit('close', code);
}

/**
 * 构造一组捕获用的流式回调
 */
function makeStreaming() {
  return {
    onContent: vi.fn(),
    onToolUse: vi.fn(),
    onUsage: vi.fn(),
    onStatusChange: vi.fn(),
    onThinking: vi.fn(),
  };
}

beforeEach(() => {
  childInstances.length = 0;
  spawnMock.mockClear();
});

describe('ClaudeCodeCLIAdapter - 能力声明', () => {
  it('enableStreaming=true（默认）应声明支持流式与工具', () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const caps = adapter.getCapabilities();
    expect(caps.supportsStreaming).toBe(true);
    expect(caps.supportsBatchMetadata).toBe(false);
    expect(caps.supportsToolUse).toBe(true);
  });

  it('enableStreaming=false 应回退批量能力', () => {
    const adapter = new ClaudeCodeCLIAdapter({ enableStreaming: false });
    const caps = adapter.getCapabilities();
    expect(caps.supportsStreaming).toBe(false);
    expect(caps.supportsBatchMetadata).toBe(true);
    expect(caps.supportsToolUse).toBe(false);
  });
});

describe('ClaudeCodeCLIAdapter - stream-json 流式解析', () => {
  it('text 块逐段触发 onContent，并以 result.result 为最终正文', async () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const streaming = makeStreaming();

    const p = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming,
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    // 校验使用了 stream-json + verbose 参数
    const args = (spawnMock.mock.calls[0][1] ?? []) as string[];
    expect(args).toContain('--output-format=stream-json');
    expect(args).toContain('--verbose');

    driveChild(childInstances[0], [
      '{"type":"system","subtype":"init"}\n',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello "}]}}\n',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"world"}]}}\n',
      '{"type":"result","result":"Hello world","stop_reason":"end_turn","usage":{"input_tokens":10,"output_tokens":5},"total_cost_usd":0.02,"ttft_ms":100}\n',
    ]);

    const result = await p;

    expect(result).toBe('Hello world');
    expect(streaming.onContent).toHaveBeenCalledTimes(2);
    expect(streaming.onContent).toHaveBeenNthCalledWith(1, 'Hello ');
    expect(streaming.onContent).toHaveBeenNthCalledWith(2, 'world');

    // usage 携带 cost
    expect(streaming.onUsage).toHaveBeenCalledTimes(1);
    const usage = streaming.onUsage.mock.calls[0][0];
    expect(usage.inputTokens).toBe(10);
    expect(usage.cost?.totalCost).toBe(0.02);

    // 状态：先 thinking，最后 completed
    const statuses = streaming.onStatusChange.mock.calls.map((c: any[]) => c[0]);
    expect(statuses[0]).toBe('thinking');
    expect(statuses).toContain('completed');
  });

  it('tool_use 块触发 onToolUse 与 tool_use 状态', async () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const streaming = makeStreaming();

    const p = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'run' }],
      streaming,
    });

    driveChild(childInstances[0], [
      '{"type":"assistant","message":{"content":[{"type":"tool_use","id":"t1","name":"Bash","input":{"cmd":"ls"}}]}}\n',
      '{"type":"result","result":"done","stop_reason":"end_turn"}\n',
    ]);

    const result = await p;

    expect(result).toBe('done');
    expect(streaming.onToolUse).toHaveBeenCalledTimes(1);
    const tool = streaming.onToolUse.mock.calls[0][0];
    expect(tool).toMatchObject({
      id: 't1',
      toolName: 'Bash',
      action: 'invoke',
      params: { cmd: 'ls' },
      status: 'running',
    });
    const statuses = streaming.onStatusChange.mock.calls.map((c: any[]) => c[0]);
    expect(statuses).toContain('tool_use');
  });

  it('跨 data chunk 的半行能正确拼接解析', async () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const streaming = makeStreaming();

    const p = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming,
    });

    driveChild(childInstances[0], [
      '{"type":"assist',
      'ant","message":{"content":[{"type":"text","text":"Hello"}]}}\n',
      '{"type":"result","result":"Hello"}\n',
    ]);

    const result = await p;
    expect(result).toBe('Hello');
    expect(streaming.onContent).toHaveBeenCalledTimes(1);
    expect(streaming.onContent).toHaveBeenCalledWith('Hello');
  });

  it('非法 JSON 行被跳过且不抛错', async () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const streaming = makeStreaming();

    const p = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming,
    });

    driveChild(childInstances[0], [
      'not json at all\n',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"ok"}]}}\n',
      '{"type":"result","result":"ok"}\n',
    ]);

    const result = await p;
    expect(result).toBe('ok');
    expect(streaming.onContent).toHaveBeenCalledWith('ok');
  });

  it('进程非 0 退出应 reject', async () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const streaming = makeStreaming();

    const p = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming,
    });

    driveChild(childInstances[0], ['{"type":"system"}\n'], 1);

    await expect(p).rejects.toThrow(/exited with code 1/);
  });
});

describe('ClaudeCodeCLIAdapter - 批量回退', () => {
  it('enableStreaming=false 时走批量 JSON 路径并补发结束态', async () => {
    const adapter = new ClaudeCodeCLIAdapter({ enableStreaming: false });
    const streaming = makeStreaming();

    const p = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming,
    });

    // 批量路径使用 --output-format=json（非 stream-json）
    const args = (spawnMock.mock.calls[0][1] ?? []) as string[];
    expect(args).toContain('--output-format=json');
    expect(args).not.toContain('--output-format=stream-json');

    driveChild(childInstances[0], [
      '{"type":"result","result":"batch answer","stop_reason":"end_turn","usage":{"input_tokens":3,"output_tokens":4},"total_cost_usd":0.01}',
    ]);

    const result = await p;
    expect(result).toBe('batch answer');
    // 批量路径下不应触发逐段 onContent
    expect(streaming.onContent).not.toHaveBeenCalled();
    // 补发 usage 与 completed
    expect(streaming.onUsage).toHaveBeenCalledTimes(1);
    const statuses = streaming.onStatusChange.mock.calls.map((c: any[]) => c[0]);
    expect(statuses).toContain('completed');
  });
});
