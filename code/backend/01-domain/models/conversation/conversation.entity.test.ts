import { describe, it, expect } from 'vitest';
import { ConversationEntity } from './conversation.entity';

describe('ConversationEntity', () => {
  const validProps = {
    conversationId: 'conv-001',
    agentId: 'agent-001',
    channelId: 'channel-001',
    participants: [
      {
        id: 'user-001',
        type: 'human' as const,
        joinedAt: new Date('2026-05-01T00:00:00Z'),
      },
      {
        id: 'agent-001',
        type: 'agent' as const,
        joinedAt: new Date('2026-05-01T00:00:00Z'),
      },
    ],
    status: 'active' as const,
    context: {
      taskId: 'task-001',
    },
    statistics: {
      messageCount: 10,
      turnCount: 5,
      tokenUsage: {
        inputTokens: 5000,
        outputTokens: 3000,
        totalTokens: 8000,
      },
      cost: {
        totalCostUsd: 0.5,
      },
    },
    startedAt: new Date('2026-05-01T00:00:00Z'),
    lastMessageAt: new Date('2026-05-01T01:00:00Z'),
    meta: {
      tags: ['development'],
      title: 'Feature implementation',
    },
  };

  describe('create', () => {
    it('should create a valid conversation entity', () => {
      const conversation = ConversationEntity.create(validProps);
      expect(conversation.conversationId).toBe('conv-001');
      expect(conversation.status).toBe('active');
    });

    it('should throw error if conversationId is empty', () => {
      expect(() =>
        ConversationEntity.create({ ...validProps, conversationId: '' })
      ).toThrow('Conversation ID cannot be empty');
    });

    it('should throw error if no participants', () => {
      expect(() =>
        ConversationEntity.create({ ...validProps, participants: [] })
      ).toThrow('Conversation must have at least one participant');
    });
  });

  describe('status checks', () => {
    it('should correctly identify status', () => {
      const conversation = ConversationEntity.create(validProps);
      expect(conversation.isActive()).toBe(true);
      expect(conversation.isPaused()).toBe(false);
      expect(conversation.isCompleted()).toBe(false);
    });
  });

  describe('participant operations', () => {
    it('should check if participant exists', () => {
      const conversation = ConversationEntity.create(validProps);
      expect(conversation.hasParticipant('user-001')).toBe(true);
      expect(conversation.hasParticipant('user-999')).toBe(false);
    });

    it('should get participant by id', () => {
      const conversation = ConversationEntity.create(validProps);
      const participant = conversation.getParticipant('user-001');
      expect(participant).toBeDefined();
      expect(participant?.type).toBe('human');
    });

    it('should get human participants', () => {
      const conversation = ConversationEntity.create(validProps);
      const humans = conversation.getHumanParticipants();
      expect(humans.length).toBe(1);
      expect(humans[0].id).toBe('user-001');
    });

    it('should add participant', () => {
      const conversation = ConversationEntity.create(validProps);
      const newParticipant = {
        id: 'user-002',
        type: 'human' as const,
        joinedAt: new Date(),
      };
      const updated = conversation.addParticipant(newParticipant);
      expect(updated.participants.length).toBe(3);
    });
  });

  describe('status transitions', () => {
    it('should pause conversation', () => {
      const conversation = ConversationEntity.create(validProps);
      const updated = conversation.pause();
      expect(updated.status).toBe('paused');
    });

    it('should resume conversation', () => {
      const conversation = ConversationEntity.create({
        ...validProps,
        status: 'paused',
      });
      const updated = conversation.resume();
      expect(updated.status).toBe('active');
    });

    it('should complete conversation', () => {
      const conversation = ConversationEntity.create(validProps);
      const updated = conversation.complete();
      expect(updated.status).toBe('completed');
      expect(updated.completedAt).toBeDefined();
    });

    it('should archive conversation', () => {
      const conversation = ConversationEntity.create({
        ...validProps,
        status: 'completed',
        completedAt: new Date(),
      });
      const updated = conversation.archive();
      expect(updated.status).toBe('archived');
      expect(updated.archivedAt).toBeDefined();
    });
  });

  describe('statistics', () => {
    it('should increment message count', () => {
      const conversation = ConversationEntity.create(validProps);
      const updated = conversation.incrementMessageCount();
      expect(updated.statistics.messageCount).toBe(11);
    });

    it('should update token usage', () => {
      const conversation = ConversationEntity.create(validProps);
      const updated = conversation.updateTokenUsage(1000, 500);
      expect(updated.statistics.tokenUsage.inputTokens).toBe(6000);
      expect(updated.statistics.tokenUsage.outputTokens).toBe(3500);
      expect(updated.statistics.tokenUsage.totalTokens).toBe(9500);
    });

    it('should calculate average tokens per message', () => {
      const conversation = ConversationEntity.create(validProps);
      expect(conversation.getAverageTokensPerMessage()).toBe(800);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const conversation = ConversationEntity.create(validProps);
      const json = conversation.toJSON();
      expect(json.conversation_id).toBe('conv-001');
      expect(json.status).toBe('active');
    });

    it('should deserialize from JSON', () => {
      const conversation = ConversationEntity.create(validProps);
      const json = conversation.toJSON();
      const deserialized = ConversationEntity.fromJSON(json);
      expect(deserialized.conversationId).toBe(conversation.conversationId);
    });
  });
});
