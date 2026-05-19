import { describe, it, expect, beforeEach } from 'vitest';
import { MessageMentionService } from './message-mention.service';

describe('MessageMentionService', () => {
  let service: MessageMentionService;
  let availableUsers: Map<string, string>;
  let availableAgents: Map<string, string>;

  beforeEach(() => {
    service = new MessageMentionService();
    availableUsers = new Map([
      ['alice', 'user-1'],
      ['bob', 'user-2'],
      ['charlie', 'user-3'],
    ]);
    availableAgents = new Map([
      ['assistant', 'agent-1'],
      ['codebot', 'agent-2'],
    ]);
  });

  describe('parseMentions', () => {
    it('should parse user mentions', () => {
      const content = 'Hello @alice and @bob!';
      const result = service.parseMentions(content, availableUsers, availableAgents);

      expect(result.mentions).toHaveLength(2);
      expect(result.mentions[0]).toEqual({
        type: 'user',
        id: 'user-1',
        name: 'alice',
        position: 6,
      });
      expect(result.mentions[1]).toEqual({
        type: 'user',
        id: 'user-2',
        name: 'bob',
        position: 17,
      });
      expect(result.mentionedUserIds).toEqual(['user-1', 'user-2']);
      expect(result.mentionedAgentIds).toEqual([]);
    });

    it('should parse agent mentions', () => {
      const content = 'Hey @assistant, can you help?';
      const result = service.parseMentions(content, availableUsers, availableAgents);

      expect(result.mentions).toHaveLength(1);
      expect(result.mentions[0]).toEqual({
        type: 'agent',
        id: 'agent-1',
        name: 'assistant',
        position: 4,
      });
      expect(result.mentionedAgentIds).toEqual(['agent-1']);
      expect(result.mentionedUserIds).toEqual([]);
    });

    it('should parse mixed user and agent mentions', () => {
      const content = '@alice please work with @assistant and @bob';
      const result = service.parseMentions(content, availableUsers, availableAgents);

      expect(result.mentions).toHaveLength(3);
      expect(result.mentionedUserIds).toEqual(['user-1', 'user-2']);
      expect(result.mentionedAgentIds).toEqual(['agent-1']);
    });

    it('should parse channel mentions', () => {
      const content = 'Check out #general and #dev-team';
      const result = service.parseMentions(content, availableUsers, availableAgents);

      expect(result.mentions).toHaveLength(2);
      expect(result.mentions[0]).toEqual({
        type: 'channel',
        id: 'general',
        name: 'general',
        position: 10,
      });
      expect(result.mentions[1]).toEqual({
        type: 'channel',
        id: 'dev-team',
        name: 'dev-team',
        position: 23,
      });
      expect(result.mentionedChannelIds).toEqual(['general', 'dev-team']);
    });

    it('should ignore unknown mentions', () => {
      const content = 'Hello @unknown and @nonexistent';
      const result = service.parseMentions(content, availableUsers, availableAgents);

      expect(result.mentions).toHaveLength(0);
      expect(result.mentionedUserIds).toEqual([]);
      expect(result.mentionedAgentIds).toEqual([]);
    });

    it('should handle duplicate mentions', () => {
      const content = '@alice @alice @alice';
      const result = service.parseMentions(content, availableUsers, availableAgents);

      expect(result.mentions).toHaveLength(3);
      expect(result.mentionedUserIds).toEqual(['user-1']); // Deduplicated
    });

    it('should handle empty content', () => {
      const result = service.parseMentions('', availableUsers, availableAgents);

      expect(result.mentions).toHaveLength(0);
      expect(result.mentionedUserIds).toEqual([]);
      expect(result.mentionedAgentIds).toEqual([]);
      expect(result.mentionedChannelIds).toEqual([]);
    });

    it('should handle content with no mentions', () => {
      const content = 'This is a regular message without any mentions';
      const result = service.parseMentions(content, availableUsers, availableAgents);

      expect(result.mentions).toHaveLength(0);
      expect(result.mentionedUserIds).toEqual([]);
      expect(result.mentionedAgentIds).toEqual([]);
    });

    it('should handle mentions at different positions', () => {
      const content = '@alice start, middle @bob, end @charlie';
      const result = service.parseMentions(content, availableUsers, availableAgents);

      expect(result.mentions).toHaveLength(3);
      expect(result.mentions[0].position).toBe(0);
      expect(result.mentions[1].position).toBe(21);
      expect(result.mentions[2].position).toBe(31);
    });
  });

  describe('mentionsUser', () => {
    it('should return true when user is mentioned', () => {
      const content = 'Hello @alice, how are you?';
      expect(service.mentionsUser(content, 'alice')).toBe(true);
    });

    it('should return false when user is not mentioned', () => {
      const content = 'Hello @bob, how are you?';
      expect(service.mentionsUser(content, 'alice')).toBe(false);
    });

    it('should be case insensitive', () => {
      const content = 'Hello @Alice, how are you?';
      expect(service.mentionsUser(content, 'alice')).toBe(true);
    });

    it('should match word boundaries', () => {
      const content = 'Hello @alice123, how are you?';
      expect(service.mentionsUser(content, 'alice')).toBe(false);
    });

    it('should handle empty content', () => {
      expect(service.mentionsUser('', 'alice')).toBe(false);
    });
  });

  describe('hasMentions', () => {
    it('should return true when content has mentions', () => {
      expect(service.hasMentions('Hello @alice')).toBe(true);
      expect(service.hasMentions('@bob how are you?')).toBe(true);
      expect(service.hasMentions('Check @someone in the middle')).toBe(true);
    });

    it('should return false when content has no mentions', () => {
      expect(service.hasMentions('Hello world')).toBe(false);
      expect(service.hasMentions('No mentions here')).toBe(false);
      expect(service.hasMentions('')).toBe(false);
    });

    it('should detect mentions with underscores and numbers', () => {
      expect(service.hasMentions('@user_123')).toBe(true);
      expect(service.hasMentions('@agent_v2')).toBe(true);
    });
  });
});
