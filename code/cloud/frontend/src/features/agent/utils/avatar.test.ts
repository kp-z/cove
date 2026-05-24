import { describe, it, expect } from 'vitest';
import { getAgentAvatarUrl, getAgentInitials } from './avatar';

describe('avatar utils', () => {
  describe('getAgentAvatarUrl', () => {
    it('should return undefined for null or undefined', () => {
      expect(getAgentAvatarUrl(null)).toBeUndefined();
      expect(getAgentAvatarUrl(undefined)).toBeUndefined();
    });

    it('should return full URL as-is', () => {
      expect(getAgentAvatarUrl('https://example.com/avatar.png')).toBe('https://example.com/avatar.png');
      expect(getAgentAvatarUrl('http://example.com/avatar.png')).toBe('http://example.com/avatar.png');
    });

    it('should prepend API URL for relative paths', () => {
      const result = getAgentAvatarUrl('avatars/agent-123.png');
      expect(result).toContain('avatars/agent-123.png');
    });

    it('should handle object with url property', () => {
      const result = getAgentAvatarUrl({ url: 'https://example.com/avatar.png' });
      expect(result).toBe('https://example.com/avatar.png');
    });

    it('should return undefined for invalid types', () => {
      expect(getAgentAvatarUrl(123 as any)).toBeUndefined();
      expect(getAgentAvatarUrl({} as any)).toBeUndefined();
    });
  });

  describe('getAgentInitials', () => {
    it('should return first two letters for single word', () => {
      expect(getAgentInitials('Agent')).toBe('AG');
    });

    it('should return first letter of first two words', () => {
      expect(getAgentInitials('Test Agent')).toBe('TA');
    });

    it('should handle camelCase names', () => {
      expect(getAgentInitials('TestAgent')).toBe('TA');
    });

    it('should handle hyphenated names', () => {
      expect(getAgentInitials('test-agent')).toBe('TA');
    });

    it('should handle underscore names', () => {
      expect(getAgentInitials('test_agent')).toBe('TA');
    });

    it('should handle multiple words', () => {
      expect(getAgentInitials('My Test Agent')).toBe('MT');
    });

    it('should convert to uppercase', () => {
      expect(getAgentInitials('test agent')).toBe('TA');
    });

    it('should handle single character names', () => {
      expect(getAgentInitials('A')).toBe('A');
    });

    it('should handle undefined name gracefully', () => {
      expect(getAgentInitials(undefined)).toBe('??');
    });

    it('should handle null name gracefully', () => {
      expect(getAgentInitials(null)).toBe('??');
    });

    it('should handle empty string gracefully', () => {
      expect(getAgentInitials('')).toBe('??');
    });

    it('should handle non-string values gracefully', () => {
      expect(getAgentInitials(123 as any)).toBe('??');
      expect(getAgentInitials({} as any)).toBe('??');
    });

    it('should handle mixed case with spaces', () => {
      // 'testAgent Name' splits into ['test', 'Agent', 'Name'], takes first two: 'test' and 'Agent'
      expect(getAgentInitials('testAgent Name')).toBe('TA');
    });
  });
});
