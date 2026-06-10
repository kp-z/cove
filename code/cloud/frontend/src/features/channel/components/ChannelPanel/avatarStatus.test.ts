import { describe, it, expect } from 'vitest';
import { mapStreamingPhaseToAvatarStatus } from './avatarStatus';

/**
 * mapStreamingPhaseToAvatarStatus 单元测试
 * 覆盖：失败优先、各流式阶段映射、completed/undefined 不显示。
 */
describe('mapStreamingPhaseToAvatarStatus', () => {
  // 步骤 1：失败优先 —— isFailed=true 时无论阶段一律 error
  it('isFailed=true 时返回 error（优先级最高）', () => {
    expect(mapStreamingPhaseToAvatarStatus('thinking', true)).toBe('error');
    expect(mapStreamingPhaseToAvatarStatus('responding', true)).toBe('error');
    expect(mapStreamingPhaseToAvatarStatus(undefined, true)).toBe('error');
  });

  // 步骤 2：failed 阶段映射为 error
  it("phase='failed' 时返回 error", () => {
    expect(mapStreamingPhaseToAvatarStatus('failed')).toBe('error');
  });

  // 步骤 3：pending / accepted → loading
  it('pending / accepted 映射为 loading', () => {
    expect(mapStreamingPhaseToAvatarStatus('pending')).toBe('loading');
    expect(mapStreamingPhaseToAvatarStatus('accepted')).toBe('loading');
  });

  // 步骤 4：thinking → thinking
  it("thinking 映射为 thinking", () => {
    expect(mapStreamingPhaseToAvatarStatus('thinking')).toBe('thinking');
  });

  // 步骤 5：tool_use → tool
  it("tool_use 映射为 tool", () => {
    expect(mapStreamingPhaseToAvatarStatus('tool_use')).toBe('tool');
  });

  // 步骤 6：responding → responding
  it("responding 映射为 responding", () => {
    expect(mapStreamingPhaseToAvatarStatus('responding')).toBe('responding');
  });

  // 步骤 7：completed / 无 phase → undefined（不显示）
  it('completed 或无 phase 返回 undefined', () => {
    expect(mapStreamingPhaseToAvatarStatus('completed')).toBeUndefined();
    expect(mapStreamingPhaseToAvatarStatus(undefined)).toBeUndefined();
  });
});
