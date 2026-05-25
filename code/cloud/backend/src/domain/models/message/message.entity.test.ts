import { describe, it, expect } from 'vitest';
import { MessageEntity } from './message.entity';

describe('MessageEntity', () => {
  const validProps = {
    messageId: 'msg-001',
    msgShortId: 'a1b2c3d4',
    senderId: 'user-001',
    senderType: 'human' as const,
    senderName: 'kp-user',
    channelId: 'channel-001',
    channelName: '#general',
    threadId: undefined,
    isThreadRoot: false,
    content: 'Hello world',
    contentType: 'text' as const,
    contentFormat: 'plain' as const,
    attachments: [],
    mentions: [],
    references: [],
    status: 'sent' as const,
    isEdited: false,
    editHistory: [],
    reactions: [],
    createdAt: new Date('2026-05-02T10:00:00Z'),
    updatedAt: new Date('2026-05-02T10:00:00Z'),
    meta: {
      client: 'web',
      isPinned: false,
      isImportant: false,
    },
  };

  describe('create', () => {
    it('should create a valid message entity', () => {
      const message = MessageEntity.create(validProps);

      expect(message.messageId).toBe('msg-001');
      expect(message.content).toBe('Hello world');
      expect(message.status).toBe('sent');
    });

    it('should throw error if messageId is empty', () => {
      expect(() =>
        MessageEntity.create({ ...validProps, messageId: '' })
      ).toThrow('Message ID cannot be empty');
    });

    it('should throw error if senderId is empty', () => {
      expect(() =>
        MessageEntity.create({ ...validProps, senderId: '' })
      ).toThrow('Sender ID cannot be empty');
    });

    it('should throw error if content and attachments are both empty', () => {
      expect(() =>
        MessageEntity.create({ ...validProps, content: '', attachments: [] })
      ).toThrow('Message must have either content or attachments');
    });

    it('should allow empty content if attachments exist', () => {
      const message = MessageEntity.create({
        ...validProps,
        content: '',
        attachments: [
          {
            attachmentId: 'attach-001',
            fileName: 'test.png',
            fileType: 'image/png',
            fileSize: 1024,
            fileUrl: '/attachments/test.png',
          },
        ],
      });

      expect(message.content).toBe('');
      expect(message.attachments.length).toBe(1);
    });
  });

  describe('type checks', () => {
    it('should correctly identify sender type', () => {
      const message = MessageEntity.create(validProps);
      expect(message.isFromHuman()).toBe(true);
      expect(message.isFromAgent()).toBe(false);
      expect(message.isFromSystem()).toBe(false);
    });

    it('should correctly identify status', () => {
      const message = MessageEntity.create(validProps);
      expect(message.isSent()).toBe(true);
      expect(message.isDraft()).toBe(false);
      expect(message.isDeleted()).toBe(false);
    });
  });

  describe('content updates', () => {
    it('should update content and track edit history', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.updateContent('Updated content', 'user-001');

      expect(updated.content).toBe('Updated content');
      expect(updated.isEdited).toBe(true);
      expect(updated.editHistory.length).toBe(1);
      expect(updated.editHistory[0].previousContent).toBe('Hello world');
    });
  });

  describe('reactions', () => {
    it('should add reaction', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.addReaction('👍', 'user-001');

      expect(updated.reactions.length).toBe(1);
      expect(updated.reactions[0].emoji).toBe('👍');
      expect(updated.reactions[0].count).toBe(1);
    });

    it('should add user to existing reaction', () => {
      const message = MessageEntity.create({
        ...validProps,
        reactions: [{ emoji: '👍', userIds: ['user-001'], count: 1 }],
      });

      const updated = message.addReaction('👍', 'user-002');
      expect(updated.reactions[0].count).toBe(2);
      expect(updated.reactions[0].userIds).toContain('user-002');
    });

    it('should not add duplicate reaction from same user', () => {
      const message = MessageEntity.create({
        ...validProps,
        reactions: [{ emoji: '👍', userIds: ['user-001'], count: 1 }],
      });

      const updated = message.addReaction('👍', 'user-001');
      expect(updated.reactions[0].count).toBe(1);
    });

    it('should remove reaction', () => {
      const message = MessageEntity.create({
        ...validProps,
        reactions: [{ emoji: '👍', userIds: ['user-001', 'user-002'], count: 2 }],
      });

      const updated = message.removeReaction('👍', 'user-001');
      expect(updated.reactions[0].count).toBe(1);
      expect(updated.reactions[0].userIds).not.toContain('user-001');
    });

    it('should remove reaction entirely when last user removes it', () => {
      const message = MessageEntity.create({
        ...validProps,
        reactions: [{ emoji: '👍', userIds: ['user-001'], count: 1 }],
      });

      const updated = message.removeReaction('👍', 'user-001');
      expect(updated.reactions.length).toBe(0);
    });
  });

  describe('pin and important', () => {
    it('should pin message', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.pin();
      expect(updated.meta.isPinned).toBe(true);
    });

    it('should unpin message', () => {
      const message = MessageEntity.create({
        ...validProps,
        meta: { ...validProps.meta, isPinned: true },
      });
      const updated = message.unpin();
      expect(updated.meta.isPinned).toBe(false);
    });

    it('should mark as important', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.markAsImportant();
      expect(updated.meta.isImportant).toBe(true);
    });
  });

  describe('status updates', () => {
    it('should update status', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.updateStatus('failed');
      expect(updated.status).toBe('failed');
    });

    it('should mark as deleted', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.markAsDeleted();
      expect(updated.status).toBe('deleted');
      expect(updated.deletedAt).toBeDefined();
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const message = MessageEntity.create(validProps);
      const json = message.toJSON();

      expect(json.message_id).toBe('msg-001');
      expect(json.content).toBe('Hello world');
      expect(json.status).toBe('sent');
    });

    it('should deserialize from JSON', () => {
      const message = MessageEntity.create(validProps);
      const json = message.toJSON();
      const deserialized = MessageEntity.fromJSON(json);

      expect(deserialized.messageId).toBe(message.messageId);
      expect(deserialized.content).toBe(message.content);
    });
  });

  describe('agent execution metadata', () => {
    describe('initAgentExecution', () => {
      it('should initialize execution metadata with API mode', () => {
        const message = MessageEntity.create(validProps);
        const updated = message.initAgentExecution('API');

        expect(updated.agentExecutionMetadata).toBeDefined();
        expect(updated.agentExecutionMetadata?.execution_mode).toBe('API');
        expect(updated.agentExecutionMetadata?.streaming_status).toBe('thinking');
        expect(updated.agentExecutionMetadata?.thinking).toBe('');
        expect(updated.agentExecutionMetadata?.tool_logs).toEqual([]);
        expect(updated.agentExecutionMetadata?.sequence).toBe(0);
        expect(updated.agentExecutionMetadata?.started_at).toBeDefined();
      });

      it('should initialize execution metadata with CLI mode', () => {
        const message = MessageEntity.create(validProps);
        const updated = message.initAgentExecution('CLI');

        expect(updated.agentExecutionMetadata?.execution_mode).toBe('CLI');
      });

      it('should initialize execution metadata with SDK mode', () => {
        const message = MessageEntity.create(validProps);
        const updated = message.initAgentExecution('SDK');

        expect(updated.agentExecutionMetadata?.execution_mode).toBe('SDK');
      });
    });

    describe('appendThinking', () => {
      it('should append thinking content', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API');

        const updated = message.appendThinking('First chunk');
        expect(updated.agentExecutionMetadata?.thinking).toBe('First chunk');
        expect(updated.agentExecutionMetadata?.sequence).toBe(1);

        const updated2 = updated.appendThinking(' Second chunk');
        expect(updated2.agentExecutionMetadata?.thinking).toBe('First chunk Second chunk');
        expect(updated2.agentExecutionMetadata?.sequence).toBe(2);
      });

      it('should throw error if metadata not initialized', () => {
        const message = MessageEntity.create(validProps);
        expect(() =>
          message.appendThinking('test')
        ).toThrow('Agent execution metadata not initialized');
      });
    });

    describe('addToolLog', () => {
      it('should add tool log with success status', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API');

        const toolLog = {
          id: 'tool-001',
          tool_name: 'search',
          action: 'execute',
          params: { query: 'test' },
          status: 'success' as const,
          duration: 150,
          result: {
            success: 'Found 5 results',
            output: 'result data',
          },
          meta: {
            file_count: 3,
            lines_changed: 10,
          },
        };

        const updated = message.addToolLog(toolLog);

        expect(updated.agentExecutionMetadata?.tool_logs?.length).toBe(1);
        expect(updated.agentExecutionMetadata?.tool_logs?.[0].tool_name).toBe('search');
        expect(updated.agentExecutionMetadata?.tool_logs?.[0].status).toBe('success');
        expect(updated.agentExecutionMetadata?.tool_logs?.[0].duration).toBe(150);
        expect(updated.agentExecutionMetadata?.sequence).toBe(1);
      });

      it('should add tool log with error status', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API');

        const toolLog = {
          id: 'tool-002',
          tool_name: 'failing_tool',
          action: 'execute',
          params: { param: 'value' },
          status: 'error' as const,
          result: {
            error: 'Tool execution failed',
          },
        };

        const updated = message.addToolLog(toolLog);

        expect(updated.agentExecutionMetadata?.tool_logs?.[0].status).toBe('error');
        expect(updated.agentExecutionMetadata?.tool_logs?.[0].result?.error).toBe('Tool execution failed');
      });

      it('should add multiple tool logs', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API');

        const updated = message
          .addToolLog({
            id: 'tool-001',
            tool_name: 'tool1',
            action: 'execute',
            status: 'success',
          })
          .addToolLog({
            id: 'tool-002',
            tool_name: 'tool2',
            action: 'execute',
            status: 'success',
          });

        expect(updated.agentExecutionMetadata?.tool_logs?.length).toBe(2);
        expect(updated.agentExecutionMetadata?.sequence).toBe(2);
      });

      it('should throw error if metadata not initialized', () => {
        const message = MessageEntity.create(validProps);
        expect(() =>
          message.addToolLog({
            id: 'tool-001',
            tool_name: 'test',
            action: 'execute',
            status: 'success',
          })
        ).toThrow('Agent execution metadata not initialized');
      });
    });

    describe('updateUsage', () => {
      it('should update basic token usage', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API');

        const usage = {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
        };

        const updated = message.updateUsage(usage);

        expect(updated.agentExecutionMetadata?.usage?.input_tokens).toBe(100);
        expect(updated.agentExecutionMetadata?.usage?.output_tokens).toBe(50);
        expect(updated.agentExecutionMetadata?.usage?.total_tokens).toBe(150);
        expect(updated.agentExecutionMetadata?.sequence).toBe(1);
      });

      it('should update usage with cache stats', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API');

        const usage = {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          cache: {
            creation_tokens: 20,
            read_tokens: 30,
            hit_rate: 0.75,
          },
        };

        const updated = message.updateUsage(usage);

        expect(updated.agentExecutionMetadata?.usage?.cache?.creation_tokens).toBe(20);
        expect(updated.agentExecutionMetadata?.usage?.cache?.read_tokens).toBe(30);
        expect(updated.agentExecutionMetadata?.usage?.cache?.hit_rate).toBe(0.75);
      });

      it('should update usage with cost and latency', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API');

        const usage = {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          cost: {
            input_cost: 0.001,
            output_cost: 0.002,
            cache_cost: 0.0005,
            total_cost: 0.0035,
          },
          model: 'claude-opus-4',
          latency: {
            first_token_ms: 500,
            total_ms: 2000,
            tokens_per_second: 25,
          },
        };

        const updated = message.updateUsage(usage);

        expect(updated.agentExecutionMetadata?.usage?.cost?.total_cost).toBe(0.0035);
        expect(updated.agentExecutionMetadata?.usage?.model).toBe('claude-opus-4');
        expect(updated.agentExecutionMetadata?.usage?.latency?.first_token_ms).toBe(500);
      });

      it('should throw error if metadata not initialized', () => {
        const message = MessageEntity.create(validProps);
        expect(() =>
          message.updateUsage({
            input_tokens: 100,
            output_tokens: 50,
            total_tokens: 150,
          })
        ).toThrow('Agent execution metadata not initialized');
      });
    });

    describe('updateStreamingStatus', () => {
      it('should update streaming status', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API');

        const updated = message.updateStreamingStatus('tool_use');
        expect(updated.agentExecutionMetadata?.streaming_status).toBe('tool_use');
        expect(updated.agentExecutionMetadata?.sequence).toBe(1);

        const updated2 = updated.updateStreamingStatus('responding');
        expect(updated2.agentExecutionMetadata?.streaming_status).toBe('responding');
        expect(updated2.agentExecutionMetadata?.sequence).toBe(2);
      });

      it('should set completed_at when status is completed', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API');

        const updated = message.updateStreamingStatus('completed');
        expect(updated.agentExecutionMetadata?.streaming_status).toBe('completed');
        expect(updated.agentExecutionMetadata?.completed_at).toBeDefined();
      });

      it('should throw error if metadata not initialized', () => {
        const message = MessageEntity.create(validProps);
        expect(() =>
          message.updateStreamingStatus('thinking')
        ).toThrow('Agent execution metadata not initialized');
      });
    });

    describe('helper methods', () => {
      it('should get current sequence', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API')
          .appendThinking('test')
          .addToolLog({
            id: 'tool-001',
            tool_name: 'tool',
            action: 'execute',
            status: 'success',
          });

        expect(message.getCurrentSequence()).toBe(2);
      });

      it('should return 0 for sequence if metadata not initialized', () => {
        const message = MessageEntity.create(validProps);
        expect(message.getCurrentSequence()).toBe(0);
      });

      it('should check if streaming', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API')
          .updateStreamingStatus('thinking');

        expect(message.isStreaming()).toBe(true);

        const completed = message.updateStreamingStatus('completed');
        expect(completed.isStreaming()).toBe(false);
      });

      it('should return false for isStreaming if metadata not initialized', () => {
        const message = MessageEntity.create(validProps);
        expect(message.isStreaming()).toBe(false);
      });

      it('should check if has agent execution metadata', () => {
        const message = MessageEntity.create(validProps);
        expect(message.hasAgentExecutionMetadata()).toBe(false);

        const withMetadata = message.initAgentExecution('API');
        expect(withMetadata.hasAgentExecutionMetadata()).toBe(true);
      });
    });

    describe('complete workflow', () => {
      it('should handle complete agent execution flow', () => {
        // 1. Initialize
        let message = MessageEntity.create(validProps)
          .initAgentExecution('API');

        expect(message.agentExecutionMetadata?.streaming_status).toBe('thinking');

        // 2. Append thinking content
        message = message
          .appendThinking('Analyzing the request...')
          .appendThinking(' Considering options...');

        expect(message.agentExecutionMetadata?.thinking).toBe(
          'Analyzing the request... Considering options...'
        );

        // 3. Use tools
        message = message
          .addToolLog({
            id: 'tool-001',
            tool_name: 'search',
            action: 'execute',
            params: { query: 'test' },
            status: 'success',
            duration: 120,
            result: {
              success: 'Found results',
              output: 'result1, result2',
            },
          })
          .updateStreamingStatus('tool_use')
          .addToolLog({
            id: 'tool-002',
            tool_name: 'analyze',
            action: 'execute',
            params: { data: 'result1' },
            status: 'success',
            duration: 80,
            result: {
              success: 'Analysis complete',
              output: 'good',
            },
          });

        expect(message.agentExecutionMetadata?.tool_logs?.length).toBe(2);

        // 4. Start responding
        message = message.updateStreamingStatus('responding');
        expect(message.agentExecutionMetadata?.streaming_status).toBe('responding');

        // 5. Complete and update usage
        message = message
          .updateUsage({
            input_tokens: 150,
            output_tokens: 200,
            total_tokens: 350,
            cache: {
              creation_tokens: 0,
              read_tokens: 50,
            },
            cost: {
              input_cost: 0.0015,
              output_cost: 0.002,
              cache_cost: 0.0005,
              total_cost: 0.004,
            },
            model: 'claude-opus-4',
            latency: {
              first_token_ms: 450,
              total_ms: 1800,
              tokens_per_second: 28,
            },
          })
          .updateStreamingStatus('completed');

        expect(message.agentExecutionMetadata?.streaming_status).toBe('completed');
        expect(message.agentExecutionMetadata?.completed_at).toBeDefined();
        expect(message.agentExecutionMetadata?.usage?.total_tokens).toBe(350);
        expect(message.isStreaming()).toBe(false);
      });
    });

    describe('serialization with metadata', () => {
      it('should serialize and deserialize agent execution metadata', () => {
        const message = MessageEntity.create(validProps)
          .initAgentExecution('API')
          .appendThinking('Test thinking')
          .addToolLog({
            id: 'tool-001',
            tool_name: 'search',
            action: 'execute',
            status: 'success',
          })
          .updateUsage({
            input_tokens: 100,
            output_tokens: 50,
            total_tokens: 150,
          });

        const json = message.toJSON();

        expect(json.agent_execution_metadata).toBeDefined();
        expect(json.agent_execution_metadata?.thinking).toBe('Test thinking');
        expect(json.agent_execution_metadata?.tool_logs?.length).toBe(1);
        expect(json.agent_execution_metadata?.usage?.total_tokens).toBe(150);
        expect(json.agent_execution_metadata?.sequence).toBe(3);

        const deserialized = MessageEntity.fromJSON(json);

        expect(deserialized.agentExecutionMetadata).toBeDefined();
        expect(deserialized.agentExecutionMetadata?.thinking).toBe('Test thinking');
        expect(deserialized.agentExecutionMetadata?.execution_mode).toBe('API');
        expect(deserialized.agentExecutionMetadata?.sequence).toBe(3);
      });
    });
  });
});
