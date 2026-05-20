import { describe, it, expect } from 'vitest';
import { getAgentAvatarUrl, getAgentInitials } from './avatar';

describe('avatar utils', () => {
  describe('getAgentAvatarUrl', () => {
    it('should generate consistent avatar URL for same id and name', () => {
      const url1 = getAgentAvatarUrl('agent-123', 'TestAgent');
      const url2 = getAgentAvatarUrl('agent-123', 'TestAgent');
      expect(url1).toBe(url2);
    });

    it('should generate different URLs for different ids', () => {
      const url1 = getAgentAvatarUrl('agent-123', 'TestAgent');
      const url2 = getAgentAvatarUrl('agent-456', 'TestAgent');
      expect(url1).not.toBe(url2);
    });

    it('should include dicebear API endpoint', () => {
      const url = getAgentAvatarUrl('agent-123', 'TestAgent');
      expect(url).toContain('https://api.dicebear.com/7.x/');
    });

    it('should encode name as seed parameter', () => {
      const url = getAgentAvatarUrl('agent-123', 'Test Agent');
      expect(url).toContain('seed=Test%20Agent');
    });

    it('should include background colors', () => {
      const url = getAgentAvatarUrl('agent-123', 'TestAgent');
      expect(url).toContain('backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf');
    });

    it('should include radius parameter', () => {
      const url = getAgentAvatarUrl('agent-123', 'TestAgent');
      expect(url).toContain('radius=50');
    });

    it('should use one of the predefined styles', () => {
      const url = getAgentAvatarUrl('agent-123', 'TestAgent');
      const styles = [
        'avataaars-neutral',
        'big-ears-neutral',
        'lorelei-neutral',
        'notionists-neutral',
        'open-peeps',
        'personas',
      ];
      const hasValidStyle = styles.some((style) => url.includes(style));
      expect(hasValidStyle).toBe(true);
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

    it('should handle empty string', () => {
      expect(getAgentInitials('')).toBe('');
    });

    it('should handle mixed case with spaces', () => {
      // 'testAgent Name' splits into ['test', 'Agent', 'Name'], takes first two: 'test' and 'Agent'
      expect(getAgentInitials('testAgent Name')).toBe('TA');
    });
  });
});
