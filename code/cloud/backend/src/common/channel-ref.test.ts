/**
 * channel-ref 归一化工具单元测试（契约3）
 */

import { describe, it, expect } from 'vitest';
import { bareChannelId, qualifiedChannelId, isSameChannel, realmIdFromChannel } from './channel-ref';

describe('channel-ref', () => {
  describe('bareChannelId', () => {
    it('去除 realm 前缀', () => {
      expect(bareChannelId('realm-1:ch-abc')).toBe('ch-abc');
    });

    it('裸 id 原样返回', () => {
      expect(bareChannelId('ch-abc')).toBe('ch-abc');
    });

    it('仅取第一个冒号后的内容（channelId 自身可含冒号）', () => {
      expect(bareChannelId('realm-1:ch:abc')).toBe('ch:abc');
    });

    it('空字符串原样返回', () => {
      expect(bareChannelId('')).toBe('');
    });
  });

  describe('qualifiedChannelId', () => {
    it('为裸 id 添加 realm 前缀', () => {
      expect(qualifiedChannelId('realm-1', 'ch-abc')).toBe('realm-1:ch-abc');
    });

    it('对已带前缀的 id 先归一化再拼接，避免重复前缀', () => {
      expect(qualifiedChannelId('realm-1', 'realm-2:ch-abc')).toBe('realm-1:ch-abc');
    });
  });

  describe('realmIdFromChannel', () => {
    it('从限定 id 提取 realm 前缀', () => {
      expect(realmIdFromChannel('realm-1:ch-abc')).toBe('realm-1');
    });

    it('裸 id 返回默认 fallback', () => {
      expect(realmIdFromChannel('ch-abc')).toBe('default');
    });

    it('支持自定义 fallback', () => {
      expect(realmIdFromChannel('ch-abc', 'realm-nexus')).toBe('realm-nexus');
    });

    it('空字符串返回 fallback', () => {
      expect(realmIdFromChannel('', 'realm-x')).toBe('realm-x');
    });
  });

  describe('isSameChannel', () => {
    it('裸 id 与限定 id 视为同一频道', () => {
      expect(isSameChannel('realm-1:ch-abc', 'ch-abc')).toBe(true);
      expect(isSameChannel('ch-abc', 'realm-1:ch-abc')).toBe(true);
    });

    it('不同频道返回 false', () => {
      expect(isSameChannel('realm-1:ch-abc', 'ch-xyz')).toBe(false);
    });

    it('任一为非字符串/空时返回 false', () => {
      expect(isSameChannel(undefined, 'ch-abc')).toBe(false);
      expect(isSameChannel('ch-abc', null)).toBe(false);
      expect(isSameChannel(123 as unknown, 'ch-abc')).toBe(false);
      expect(isSameChannel('', '')).toBe(false);
    });
  });
});
