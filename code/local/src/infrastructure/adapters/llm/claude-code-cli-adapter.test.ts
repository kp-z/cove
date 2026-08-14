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
 *   8. thinking 块 → onThinking（真实思考内容，不与 text/正文混淆）
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
  killed = false;
  kill = vi.fn((_signal?: NodeJS.Signals) => {
    this.killed = true;
    return true;
  });
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

  it('skipPermissions=true 应在 CLI 参数中添加 --dangerously-skip-permissions', () => {
    const adapter = new ClaudeCodeCLIAdapter({ skipPermissions: true });

    adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming: makeStreaming(),
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const args = (spawnMock.mock.calls[0][1] ?? []) as string[];
    expect(args).toContain('--dangerously-skip-permissions');
  });

  it('skipPermissions=false（默认）不应添加 --dangerously-skip-permissions', () => {
    const adapter = new ClaudeCodeCLIAdapter();

    adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming: makeStreaming(),
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const args = (spawnMock.mock.calls[0][1] ?? []) as string[];
    expect(args).not.toContain('--dangerously-skip-permissions');
  });

  it('useStreamInput=true 应在 CLI 参数中添加 --input-format=stream-json', () => {
    const adapter = new ClaudeCodeCLIAdapter({ useStreamInput: true });

    adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming: makeStreaming(),
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const args = (spawnMock.mock.calls[0][1] ?? []) as string[];
    expect(args).toContain('--input-format=stream-json');
  });

  it('useStreamInput=false（默认）不应添加 --input-format=stream-json', () => {
    const adapter = new ClaudeCodeCLIAdapter();

    adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming: makeStreaming(),
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const args = (spawnMock.mock.calls[0][1] ?? []) as string[];
    expect(args).not.toContain('--input-format=stream-json');
  });

  it('useStreamInput=true 应以 NDJSON 格式写入 stdin', async () => {
    const adapter = new ClaudeCodeCLIAdapter({ useStreamInput: true });

    const p = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hello' }],
      streaming: makeStreaming(),
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const child = childInstances[0];

    // 验证 stdin 写入格式
    expect(child.stdin.write).toHaveBeenCalledTimes(1);
    const writtenData = (child.stdin.write as any).mock.calls[0][0];
    expect(writtenData).toContain('{"text":');
    expect(writtenData).toContain('User: hello');

    driveChild(child, [
      '{"type":"assistant","message":{"content":[{"type":"text","text":"Hi"}]}}\n',
      '{"type":"result","result":"Hi"}\n',
    ]);

    const result = await p;
    expect(result).toBe('Hi');
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

  it('thinking 块触发 onThinking，且不与 onContent 混淆', async () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const streaming = makeStreaming();

    const p = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'why is the sky blue' }],
      streaming,
    });

    driveChild(childInstances[0], [
      '{"type":"system","subtype":"init"}\n',
      '{"type":"assistant","message":{"content":[{"type":"thinking","thinking":"Let me think about Rayleigh scattering...","signature":"sig123"}]}}\n',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"The sky is blue due to Rayleigh scattering."}]}}\n',
      '{"type":"result","result":"The sky is blue due to Rayleigh scattering.","stop_reason":"end_turn"}\n',
    ]);

    const result = await p;

    expect(result).toBe('The sky is blue due to Rayleigh scattering.');

    // thinking 块只触发 onThinking，不应混入 onContent
    expect(streaming.onThinking).toHaveBeenCalledTimes(1);
    expect(streaming.onThinking).toHaveBeenCalledWith('Let me think about Rayleigh scattering...');

    expect(streaming.onContent).toHaveBeenCalledTimes(1);
    expect(streaming.onContent).toHaveBeenCalledWith('The sky is blue due to Rayleigh scattering.');
  });

  it('捕获 system.init 事件中的 session_id', async () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const streaming = makeStreaming();

    const p = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming,
    });

    driveChild(childInstances[0], [
      '{"type":"system","subtype":"init","session_id":"sess_12345"}\n',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello"}]}}\n',
      '{"type":"result","result":"Hello","stop_reason":"end_turn","usage":{"input_tokens":5,"output_tokens":3}}\n',
    ]);

    const result = await p;

    expect(result).toBe('Hello');
    expect(streaming.onUsage).toHaveBeenCalledTimes(1);
    const usage = streaming.onUsage.mock.calls[0][0];
    expect(usage.sessionId).toBe('sess_12345');
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

  it('user.tool_result 事件更新工具状态', async () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const streaming = makeStreaming();

    const p = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'run' }],
      streaming,
    });

    driveChild(childInstances[0], [
      '{"type":"assistant","message":{"content":[{"type":"tool_use","id":"t1","name":"Bash","input":{"cmd":"ls"}}]}}\n',
      '{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"t1","content":"file1.txt\\nfile2.txt","is_error":false}]}}\n',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"Found 2 files"}]}}\n',
      '{"type":"result","result":"Found 2 files","stop_reason":"end_turn"}\n',
    ]);

    const result = await p;

    expect(result).toBe('Found 2 files');
    // 应该有 2 次 onToolUse 调用：invoke + result
    expect(streaming.onToolUse).toHaveBeenCalledTimes(2);

    // 第一次：invoke
    const toolInvoke = streaming.onToolUse.mock.calls[0][0];
    expect(toolInvoke).toMatchObject({
      id: 't1',
      toolName: 'Bash',
      action: 'invoke',
      status: 'running',
    });

    // 第二次：result
    const toolResult = streaming.onToolUse.mock.calls[1][0];
    expect(toolResult).toMatchObject({
      id: 't1',
      toolName: 'Bash',
      action: 'result',
      status: 'success',
      result: 'file1.txt\nfile2.txt',
    });
  });

  it('user.tool_result 事件处理错误状态', async () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const streaming = makeStreaming();

    const p = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'run' }],
      streaming,
    });

    driveChild(childInstances[0], [
      '{"type":"assistant","message":{"content":[{"type":"tool_use","id":"t2","name":"Read","input":{"path":"/missing.txt"}}]}}\n',
      '{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"t2","content":"File not found","is_error":true}]}}\n',
      '{"type":"result","result":"Error occurred","stop_reason":"end_turn"}\n',
    ]);

    const result = await p;

    expect(result).toBe('Error occurred');
    expect(streaming.onToolUse).toHaveBeenCalledTimes(2);

    // 第二次调用应该是 error 状态
    const toolResult = streaming.onToolUse.mock.calls[1][0];
    expect(toolResult).toMatchObject({
      id: 't2',
      action: 'result',
      status: 'error',
      result: 'File not found',
    });
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

describe('ClaudeCodeCLIAdapter - 取消执行', () => {
  it('流式执行收到 abort 时应终止子进程并抛出 AbortError', async () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const controller = new AbortController();

    const responsePromise = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming: makeStreaming(),
      signal: controller.signal,
    });

    const child = childInstances[0];
    controller.abort();

    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    await expect(responsePromise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('批量执行收到已取消信号时应立即终止子进程并保留 AbortError', async () => {
    const adapter = new ClaudeCodeCLIAdapter({ enableStreaming: false });
    const controller = new AbortController();
    controller.abort();

    const responsePromise = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      signal: controller.signal,
    });

    const child = childInstances[0];
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(child.stdin.write).not.toHaveBeenCalled();
    await expect(responsePromise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('正常完成后应解绑 abort 监听器', async () => {
    const adapter = new ClaudeCodeCLIAdapter();
    const controller = new AbortController();

    const responsePromise = adapter.generateResponse({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      streaming: makeStreaming(),
      signal: controller.signal,
    });
    const child = childInstances[0];

    driveChild(child, ['{"type":"result","result":"done"}\n']);
    await expect(responsePromise).resolves.toBe('done');

    controller.abort();
    expect(child.kill).not.toHaveBeenCalled();
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

describe('ClaudeCodeCLIAdapter - 多轮对话', () => {
  it('startConversation 应成功启动并捕获 session_id', async () => {
    const adapter = new ClaudeCodeCLIAdapter({
      enableStreaming: true,
      useStreamInput: true,
    });

    const p = adapter.startConversation('You are helpful');

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const child = childInstances[0];

    // 模拟 system.init 事件
    child.stdout.emit('data', Buffer.from('{"type":"system","subtype":"init","session_id":"sess_abc123"}\n'));

    const context = await p;

    expect(context.id).toMatch(/^conv_/);
    expect(context.sessionId).toBe('sess_abc123');
    expect(context.ended).toBe(false);
    expect(context.messages).toEqual([]);
  });

  it('sendMessage 应发送消息并返回回复', async () => {
    const adapter = new ClaudeCodeCLIAdapter({
      enableStreaming: true,
      useStreamInput: true,
    });

    const contextPromise = adapter.startConversation();
    const child = childInstances[0];

    // 初始化
    child.stdout.emit('data', Buffer.from('{"type":"system","subtype":"init","session_id":"sess_123"}\n'));
    const context = await contextPromise;

    // 发送消息
    const replyPromise = adapter.sendMessage(context, 'Hello');

    // 验证 stdin 写入
    expect(child.stdin.write).toHaveBeenCalled();
    const writeCalls = (child.stdin.write as any).mock.calls;
    const lastWrite = writeCalls[writeCalls.length - 1][0];
    expect(lastWrite).toContain('{"text":"Hello"}');

    // 模拟回复
    child.stdout.emit('data', Buffer.from('{"type":"assistant","message":{"content":[{"type":"text","text":"Hi there"}]}}\n'));
    child.stdout.emit('data', Buffer.from('{"type":"result","result":"Hi there","stop_reason":"end_turn"}\n'));

    const reply = await replyPromise;

    expect(reply).toBe('Hi there');
    expect(context.messages).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ]);
  });

  it('多轮对话应保持上下文', async () => {
    const adapter = new ClaudeCodeCLIAdapter({
      enableStreaming: true,
      useStreamInput: true,
    });

    const contextPromise = adapter.startConversation();
    const child = childInstances[0];

    child.stdout.emit('data', Buffer.from('{"type":"system","subtype":"init","session_id":"sess_multi"}\n'));
    const context = await contextPromise;

    // 第一轮
    const reply1Promise = adapter.sendMessage(context, 'First question');
    child.stdout.emit('data', Buffer.from('{"type":"assistant","message":{"content":[{"type":"text","text":"First answer"}]}}\n'));
    child.stdout.emit('data', Buffer.from('{"type":"result","result":"First answer"}\n'));
    const reply1 = await reply1Promise;

    expect(reply1).toBe('First answer');
    expect(context.messages.length).toBe(2);

    // 第二轮
    const reply2Promise = adapter.sendMessage(context, 'Second question');
    child.stdout.emit('data', Buffer.from('{"type":"assistant","message":{"content":[{"type":"text","text":"Second answer"}]}}\n'));
    child.stdout.emit('data', Buffer.from('{"type":"result","result":"Second answer"}\n'));
    const reply2 = await reply2Promise;

    expect(reply2).toBe('Second answer');
    expect(context.messages).toEqual([
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'Second question' },
      { role: 'assistant', content: 'Second answer' },
    ]);
  });

  it('endConversation 应结束对话并清理进程', async () => {
    const adapter = new ClaudeCodeCLIAdapter({
      enableStreaming: true,
      useStreamInput: true,
    });

    const contextPromise = adapter.startConversation();
    const child = childInstances[0];

    child.stdout.emit('data', Buffer.from('{"type":"system","subtype":"init"}\n'));
    const context = await contextPromise;

    adapter.endConversation(context);

    expect(context.ended).toBe(true);
    expect(child.stdin.end).toHaveBeenCalled();
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('在未启用流式输入时应拒绝启动对话', async () => {
    const adapter = new ClaudeCodeCLIAdapter({
      enableStreaming: true,
      useStreamInput: false, // 未启用
    });

    await expect(adapter.startConversation()).rejects.toThrow(/requires useStreamInput=true/);
  });

  it('在已结束的对话中发送消息应报错', async () => {
    const adapter = new ClaudeCodeCLIAdapter({
      enableStreaming: true,
      useStreamInput: true,
    });

    const contextPromise = adapter.startConversation();
    const child = childInstances[0];

    child.stdout.emit('data', Buffer.from('{"type":"system","subtype":"init"}\n'));
    const context = await contextPromise;

    adapter.endConversation(context);

    await expect(adapter.sendMessage(context, 'test')).rejects.toThrow(/already ended/);
  });
});
